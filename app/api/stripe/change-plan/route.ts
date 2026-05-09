import { NextResponse, type NextRequest } from "next/server";
import {
  getPlan,
  getStripePriceIdForPlan,
  isInternalPlan,
  isOneTimePlan,
  membershipPlans,
  normalizePlanId,
  resolveEffectivePlanId,
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
 * Public plans today are Free, Abroad Pass, and Memora Pass (all either
 * free or one-time payments). The recurring Plus and 3-year Max plans
 * are retired but kept resolvable for any pre-2026 subscribers, so this
 * endpoint still has to handle "legacy recurring sub → switch to a
 * one-time plan or Free."
 *
 * Routing by (current plan → target plan):
 *   - No active sub → 409 with redirect: "checkout"
 *     (caller falls back to /api/stripe/create-checkout-session)
 *   - Legacy-recurring (plus / legacy-max) → Free →
 *     cancel_at_period_end on current sub
 *   - Legacy-recurring → one-time plan (Memora Pass, Abroad Pass) →
 *     cancel_at_period_end on current sub, return a one-time Checkout
 *     Session URL for the lump-sum payment
 *   - Active one-time plan (lifetime) → recurring legacy plan → blocked:
 *     the active term already covers premium features
 *
 * Webhook (`customer.subscription.updated`) is the source of truth for
 * the DB sync; this endpoint never writes the profile directly.
 */

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
  if (!membershipPlans.some((p) => p.id === targetPlanId)) {
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

  // 4. Block one-time-plan holders from switching back to a (now legacy)
  // recurring plan during their active term — they'd lose paid time and
  // start a new monthly bill on top of the term they already paid for.
  // Defensive only: the public picker no longer offers Plus or Max.
  if (
    (effectivePlanId === "lifetime" ||
      effectivePlanId === "abroad_pass" ||
      effectivePlanId === "memora_pass") &&
    (targetPlanId === "plus" || targetPlanId === "max")
  ) {
    return NextResponse.json(
      {
        error:
          "Your current pass already covers premium features. Wait until your term ends before switching to a recurring plan.",
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

  // 7. Legacy-recurring → one-time plan (Memora Pass, Abroad Pass, or
  // legacy 3-year Max): cancel current sub at period end, then issue a
  // Checkout URL for the one-time payment. Slight overlap (≤ one
  // billing period of paid time they've already covered) is intentional
  // — see decision (2a) in the design doc / chat.
  if (isOneTimePlan(targetPlanId)) {
    const planLabel = getPlan(targetPlanId).name;
    try {
      await stripe.subscriptions.update(subscriptionId, {
        cancel_at_period_end: true,
      });
    } catch (err) {
      console.error("Memora: change-plan one-time pre-cancel failed", err);
      return NextResponse.json(
        { error: `Could not start ${planLabel} upgrade. Please try again.` },
        { status: 500 },
      );
    }

    let priceId: string;
    try {
      priceId = getStripePriceIdForPlan(targetPlanId);
    } catch (err) {
      console.error("Memora: change-plan one-time price env missing", err);
      // Roll back the schedule so we don't leave the user pending-cancel
      // with no path forward.
      await stripe.subscriptions
        .update(subscriptionId, { cancel_at_period_end: false })
        .catch(() => {});
      return NextResponse.json(
        { error: `${planLabel} not currently available.` },
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
        metadata: { user_id: user.id, plan_id: targetPlanId },
        payment_intent_data: {
          metadata: { user_id: user.id, plan_id: targetPlanId },
        },
        success_url: successUrl,
        cancel_url: cancelUrl,
      });
      return NextResponse.json({ url: session.url });
    } catch (err) {
      console.error("Memora: change-plan one-time checkout failed", err);
      // Roll back the schedule on checkout-creation failure so the user
      // isn't stranded with a pending cancel and no completed upgrade.
      await stripe.subscriptions
        .update(subscriptionId, { cancel_at_period_end: false })
        .catch(() => {});
      return NextResponse.json(
        { error: `Could not start ${planLabel} checkout.` },
        { status: 500 },
      );
    }
  }

  // Switching to a (now retired) recurring plan from any other state is
  // not a flow we support today — Plus and Max are hidden from every
  // public picker and only kept resolvable for read-only legacy access.
  return NextResponse.json(
    { error: "Unsupported plan change." },
    { status: 400 },
  );
}
