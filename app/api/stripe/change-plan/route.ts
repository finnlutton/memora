import { NextResponse, type NextRequest } from "next/server";
import type Stripe from "stripe";
import {
  getStripePriceIdForPlan,
  isInternalPlan,
  membershipPlans,
  normalizePlanId,
  resolveEffectivePlanId,
  type MembershipPlanId,
} from "@/lib/plans";
import { checkRateLimit } from "@/lib/rate-limit";
import { buildAbsoluteAppUrl, getServerSiteOrigin } from "@/lib/site-url";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { getStripeClient } from "@/lib/stripe";

export const runtime = "nodejs";

/**
 * Universal "change my plan" endpoint.
 *
 * Replaces stacked-Checkout upgrades (which created a second subscription
 * and double-charged the user) with proper in-place subscription updates.
 *
 * Routing by (current plan → target plan):
 *   - No active sub → 409 with redirect: "checkout"
 *     (caller falls back to /api/stripe/create-checkout-session)
 *   - Plus ↔ Max → stripe.subscriptions.update() with proration:
 *       upgrade   → proration_behavior: "always_invoice"
 *                   payment_behavior:   "error_if_incomplete"
 *                   (refuses the change if payment fails — keeps old plan)
 *       downgrade → proration_behavior: "create_prorations"
 *                   (credit appears on next regular invoice)
 *   - Plus/Max → Free → cancel_at_period_end on current sub
 *   - Plus/Max → Founder → cancel_at_period_end on current sub, return a
 *     one-time Checkout Session URL for the Founder payment
 *   - Founder → anything paid → blocked: Founder term already covers all
 *     paid features
 *
 * Webhook (`customer.subscription.updated`) is the source of truth for
 * the DB sync; this endpoint never writes the profile directly.
 */

const PLAN_RANK: Record<MembershipPlanId, number> = {
  free: 0,
  plus: 1,
  max: 2,
  lifetime: 3,
  internal: 4,
};

const ACTIVE_SUB_STATUSES = new Set(["active", "trialing", "past_due"]);

type ProfileRow = {
  id: string;
  email: string | null;
  stripe_customer_id: string | null;
  stripe_subscription_id: string | null;
  subscription_status: string | null;
  selected_plan: string | null;
  is_internal_account: boolean;
  subscription_current_period_end: string | null;
};

export async function POST(request: NextRequest) {
  // 1. Auth.
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();
  if (authError || !user) {
    return NextResponse.json({ error: "Not authenticated." }, { status: 401 });
  }

  const rate = await checkRateLimit(request, {
    name: "stripe-change-plan",
    limit: 10,
    window: "1 m",
    key: user.id,
  });
  if (!rate.allowed) return rate.response;

  // 2. Parse + validate.
  const body = (await request.json().catch(() => null)) as {
    planId?: string;
  } | null;
  const requestedPlanId = body?.planId;
  if (!requestedPlanId) {
    return NextResponse.json(
      { error: "planId is required." },
      { status: 400 },
    );
  }
  const targetPlanId = normalizePlanId(requestedPlanId);
  const targetPlan = membershipPlans.find((p) => p.id === targetPlanId);
  if (!targetPlan) {
    return NextResponse.json({ error: "Unknown plan." }, { status: 400 });
  }
  if (isInternalPlan(targetPlanId)) {
    return NextResponse.json(
      { error: "Internal plans are not purchasable." },
      { status: 400 },
    );
  }

  // 3. Load profile.
  const admin = createSupabaseAdminClient();
  const { data: profile, error: profileError } = await admin
    .from("profiles")
    .select(
      "id, email, stripe_customer_id, stripe_subscription_id, subscription_status, selected_plan, is_internal_account, subscription_current_period_end",
    )
    .eq("id", user.id)
    .maybeSingle<ProfileRow>();
  if (profileError) {
    console.error("Memora: change-plan profile read failed", profileError);
    return NextResponse.json(
      { error: "Could not load your account." },
      { status: 500 },
    );
  }
  if (!profile) {
    return NextResponse.json({ error: "Profile not found." }, { status: 404 });
  }
  if (profile.is_internal_account) {
    return NextResponse.json(
      { error: "This account already has full access." },
      { status: 400 },
    );
  }

  const effectivePlanId = resolveEffectivePlanId({
    selected_plan: profile.selected_plan,
    is_internal_account: profile.is_internal_account,
    subscription_current_period_end: profile.subscription_current_period_end,
  });

  if (effectivePlanId === targetPlanId) {
    return NextResponse.json(
      { error: "You're already on this plan." },
      { status: 400 },
    );
  }

  // 4. Block Founder → recurring during active term — they already have
  // everything Plus/Max offer, charging again would be silly.
  if (
    effectivePlanId === "lifetime" &&
    (targetPlanId === "plus" || targetPlanId === "max")
  ) {
    return NextResponse.json(
      {
        error:
          "Your Founder access already includes everything in Plus and Max. Wait until your Founder term ends to switch to a recurring plan.",
      },
      { status: 400 },
    );
  }

  const stripe = getStripeClient();
  const hasActiveSub = Boolean(
    profile.stripe_subscription_id &&
      profile.subscription_status &&
      ACTIVE_SUB_STATUSES.has(profile.subscription_status),
  );

  // 5. No active subscription → caller should use the checkout flow.
  if (!hasActiveSub) {
    return NextResponse.json(
      {
        redirect: "checkout",
        error:
          "No active subscription to change — start a new checkout instead.",
      },
      { status: 409 },
    );
  }

  const subscriptionId = profile.stripe_subscription_id!;

  // 6. Plus/Max → Free: schedule cancellation at period end.
  if (targetPlanId === "free") {
    try {
      await stripe.subscriptions.update(subscriptionId, {
        cancel_at_period_end: true,
      });
      return NextResponse.json({
        ok: true,
        scheduled: true,
        message: `You'll keep your current plan until the end of this billing period, then drop to Free automatically.`,
      });
    } catch (err) {
      console.error(
        "Memora: change-plan cancel-at-period-end failed",
        err,
      );
      return NextResponse.json(
        { error: "Could not schedule cancellation. Please try again." },
        { status: 500 },
      );
    }
  }

  // 7. Plus/Max → Founder: cancel current sub at period end, then issue a
  // Checkout URL for the one-time Founder payment. Slight overlap (≤ one
  // billing period of paid time they've already covered) is intentional —
  // see decision (2a) in the design doc / chat.
  if (targetPlanId === "lifetime") {
    try {
      await stripe.subscriptions.update(subscriptionId, {
        cancel_at_period_end: true,
      });
    } catch (err) {
      console.error("Memora: change-plan founder pre-cancel failed", err);
      return NextResponse.json(
        { error: "Could not start Founder upgrade. Please try again." },
        { status: 500 },
      );
    }

    let priceId: string;
    try {
      priceId = getStripePriceIdForPlan("lifetime");
    } catch (err) {
      console.error("Memora: change-plan founder price env missing", err);
      // Roll back the schedule so we don't leave the user pending-cancel
      // with no path forward.
      await stripe.subscriptions
        .update(subscriptionId, { cancel_at_period_end: false })
        .catch(() => {});
      return NextResponse.json(
        { error: "Founder plan not currently available." },
        { status: 500 },
      );
    }

    const origin = getServerSiteOrigin(request.headers.get("origin"));
    const successUrl = buildAbsoluteAppUrl(
      "/galleries?checkout=success",
      origin,
    );
    const cancelUrl = buildAbsoluteAppUrl(
      "/galleries/settings/membership?checkout=cancelled",
      origin,
    );

    try {
      const session = await stripe.checkout.sessions.create({
        mode: "payment",
        customer: profile.stripe_customer_id ?? undefined,
        line_items: [{ price: priceId, quantity: 1 }],
        allow_promotion_codes: true,
        client_reference_id: user.id,
        metadata: { user_id: user.id, plan_id: "lifetime" },
        payment_intent_data: {
          metadata: { user_id: user.id, plan_id: "lifetime" },
        },
        success_url: successUrl,
        cancel_url: cancelUrl,
      });
      return NextResponse.json({ url: session.url });
    } catch (err) {
      console.error("Memora: change-plan founder checkout failed", err);
      // Roll back the schedule on checkout-creation failure so the user
      // isn't stranded with a pending cancel and no completed upgrade.
      await stripe.subscriptions
        .update(subscriptionId, { cancel_at_period_end: false })
        .catch(() => {});
      return NextResponse.json(
        { error: "Could not start Founder checkout." },
        { status: 500 },
      );
    }
  }

  // 8. Plus ↔ Max: in-place subscription update with proration.
  if (targetPlanId === "plus" || targetPlanId === "max") {
    let newPriceId: string;
    try {
      newPriceId = getStripePriceIdForPlan(targetPlanId);
    } catch (err) {
      console.error("Memora: change-plan price env missing", err);
      return NextResponse.json(
        { error: "Plan not currently available." },
        { status: 500 },
      );
    }

    let subscription: Stripe.Subscription;
    try {
      subscription = await stripe.subscriptions.retrieve(subscriptionId);
    } catch (err) {
      console.error(
        "Memora: change-plan retrieve subscription failed",
        err,
      );
      return NextResponse.json(
        { error: "Could not load your subscription." },
        { status: 500 },
      );
    }

    const item = subscription.items.data[0];
    if (!item) {
      return NextResponse.json(
        { error: "Subscription has no billable items." },
        { status: 500 },
      );
    }

    const isUpgrade = PLAN_RANK[targetPlanId] > PLAN_RANK[effectivePlanId];

    try {
      await stripe.subscriptions.update(subscriptionId, {
        items: [{ id: item.id, price: newPriceId }],
        // Upgrades: bill the prorated difference now. Downgrades: stash
        // the credit for the next regular invoice.
        proration_behavior: isUpgrade ? "always_invoice" : "create_prorations",
        // Upgrades: refuse the change if payment fails so the user keeps
        // their old plan instead of landing in `incomplete`.
        // Downgrades: no immediate charge, so payment_behavior is moot —
        // omit it and let Stripe use the default.
        ...(isUpgrade
          ? { payment_behavior: "error_if_incomplete" as const }
          : {}),
        // Clear any previously-scheduled cancellation — they're staying.
        cancel_at_period_end: false,
        metadata: {
          ...(subscription.metadata ?? {}),
          user_id: user.id,
          plan_id: targetPlanId,
        },
      });
      // The customer.subscription.updated webhook will sync selected_plan,
      // stripe_price_id, and current_period_end into the profile.
      return NextResponse.json({
        ok: true,
        upgrade: isUpgrade,
        message: isUpgrade
          ? `Upgraded to ${targetPlan.name}. We charged the prorated difference for the rest of this billing period.`
          : `Switched to ${targetPlan.name}. Your unused time on the previous plan will appear as a credit on your next invoice.`,
      });
    } catch (err) {
      console.error("Memora: change-plan subscription update failed", err);
      const message =
        err instanceof Error
          ? err.message
          : "Could not change plan. Please try again.";
      return NextResponse.json({ error: message }, { status: 500 });
    }
  }

  return NextResponse.json(
    { error: "Unsupported plan change." },
    { status: 400 },
  );
}
