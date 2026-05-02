import { NextResponse, type NextRequest } from "next/server";
import type Stripe from "stripe";
import {
  isPaidPlan,
  mapStripePriceIdToPlan,
  normalizePlanId,
  type MembershipPlanId,
} from "@/lib/plans";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { getStripeClient } from "@/lib/stripe";

export const runtime = "nodejs";

/**
 * Stripe webhook receiver.
 *
 * Critical invariants:
 *  - Reads the RAW request body for signature verification.
 *  - Never throws on unknown event types — Stripe retries indefinitely.
 *  - Never downgrades is_internal_account profiles (founder/comped).
 *  - Maps Stripe price IDs back to Memora plan IDs via the centralized
 *    config so price IDs never leak into the data model in plain form.
 *  - Failures return 5xx so Stripe retries; success returns 200 fast.
 *  - Idempotent: claims event.id in stripe_processed_events before doing
 *    any work, so retried/duplicate deliveries return 200 without
 *    re-flipping subscription state. On handler failure, releases the
 *    claim so the next retry can re-process.
 */

const PG_UNIQUE_VIOLATION = "23505";

async function claimStripeEvent(
  eventId: string,
  eventType: string,
): Promise<"new" | "duplicate"> {
  const admin = createSupabaseAdminClient();
  const { error } = await admin
    .from("stripe_processed_events")
    .insert({ event_id: eventId, event_type: eventType });
  if (!error) return "new";
  if ((error as { code?: string }).code === PG_UNIQUE_VIOLATION) return "duplicate";
  throw error;
}

async function releaseStripeEvent(eventId: string): Promise<void> {
  const admin = createSupabaseAdminClient();
  const { error } = await admin
    .from("stripe_processed_events")
    .delete()
    .eq("event_id", eventId);
  if (error) {
    // Best-effort cleanup; the worst case is a single delivery being
    // permanently marked processed even though it failed, which is
    // recoverable manually.
    console.error("Memora webhook: failed to release event claim", {
      eventId,
      error,
    });
  }
}

type ProfileBillingUpdate = {
  selected_plan?: MembershipPlanId;
  stripe_customer_id?: string | null;
  stripe_subscription_id?: string | null;
  stripe_price_id?: string | null;
  subscription_status?: string | null;
  subscription_current_period_end?: string | null;
  subscription_cancel_at_period_end?: boolean;
};

const INACTIVE_STATUSES = new Set([
  "canceled",
  "incomplete_expired",
  "unpaid",
  "paused",
]);

async function applyProfileUpdate(customerId: string, update: ProfileBillingUpdate) {
  const admin = createSupabaseAdminClient();

  // Find the profile by stripe_customer_id. Falls back to nothing if the
  // customer was created outside our flow.
  const { data: profile, error: lookupError } = await admin
    .from("profiles")
    .select("id, is_internal_account, selected_plan")
    .eq("stripe_customer_id", customerId)
    .maybeSingle<{
      id: string;
      is_internal_account: boolean;
      selected_plan: string | null;
    }>();
  if (lookupError) {
    console.error("Memora webhook: profile lookup by customer failed", lookupError);
    throw lookupError;
  }
  if (!profile) {
    console.warn(
      "Memora webhook: no profile matched stripe_customer_id",
      customerId,
    );
    return;
  }

  // Internal accounts NEVER get downgraded or have their plan changed via
  // webhooks — preserve historical Stripe IDs only.
  if (profile.is_internal_account) {
    const safeUpdate: ProfileBillingUpdate = { ...update };
    delete safeUpdate.selected_plan;
    const { error: updateError } = await admin
      .from("profiles")
      .update(safeUpdate)
      .eq("id", profile.id);
    if (updateError) {
      console.error(
        "Memora webhook: internal-safe profile update failed",
        updateError,
      );
      throw updateError;
    }
    return;
  }

  const { error: updateError } = await admin
    .from("profiles")
    .update(update)
    .eq("id", profile.id);
  if (updateError) {
    console.error("Memora webhook: profile update failed", updateError);
    throw updateError;
  }
}

async function handleSubscription(subscription: Stripe.Subscription) {
  const customerId =
    typeof subscription.customer === "string"
      ? subscription.customer
      : subscription.customer.id;
  const status = subscription.status;
  const priceId = subscription.items.data[0]?.price.id ?? null;
  const mappedPlan = priceId ? mapStripePriceIdToPlan(priceId) : null;

  // Determine target plan:
  //  - active/trialing/past_due (still has access) → use mapped plan
  //  - inactive → downgrade to free, but keep IDs for history
  let nextPlan: MembershipPlanId = "free";
  if (mappedPlan && !INACTIVE_STATUSES.has(status)) {
    nextPlan = mappedPlan;
  }

  // current_period_end moved onto subscription items in newer Stripe API
  // versions. Read both shapes to stay compatible across SDK upgrades.
  const periodEndUnix =
    (subscription as unknown as { current_period_end?: number })
      .current_period_end ??
    subscription.items.data[0]?.current_period_end ??
    null;
  const periodEnd = periodEndUnix
    ? new Date(periodEndUnix * 1000).toISOString()
    : null;

  await applyProfileUpdate(customerId, {
    selected_plan: nextPlan,
    stripe_customer_id: customerId,
    stripe_subscription_id: subscription.id,
    stripe_price_id: priceId,
    subscription_status: status,
    subscription_current_period_end: periodEnd,
    subscription_cancel_at_period_end: subscription.cancel_at_period_end,
  });
}

async function handleCheckoutCompleted(session: Stripe.Checkout.Session) {
  const customerId =
    typeof session.customer === "string"
      ? session.customer
      : session.customer?.id ?? null;
  if (!customerId) return;

  // For subscription-mode sessions, the subscription event will follow
  // and carry the canonical state — skip the redundant write.
  if (session.mode === "subscription") return;

  // For one-time payment (Lifetime) sessions, this is where we activate
  // the plan. The plan id is on the session metadata.
  if (session.mode === "payment") {
    const planId = normalizePlanId(session.metadata?.plan_id ?? null);
    if (!isPaidPlan(planId)) return;
    await applyProfileUpdate(customerId, {
      selected_plan: planId,
      stripe_customer_id: customerId,
      // Lifetime has no subscription; leave subscription fields null.
      stripe_subscription_id: null,
      stripe_price_id:
        typeof session.line_items?.data[0]?.price?.id === "string"
          ? session.line_items.data[0].price.id
          : null,
      subscription_status: "lifetime",
      subscription_current_period_end: null,
      subscription_cancel_at_period_end: false,
    });
  }
}

export async function POST(request: NextRequest) {
  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;
  if (!webhookSecret) {
    console.error("Memora webhook: STRIPE_WEBHOOK_SECRET not configured");
    return NextResponse.json(
      { error: "Webhook not configured." },
      { status: 500 },
    );
  }

  const signature = request.headers.get("stripe-signature");
  if (!signature) {
    return NextResponse.json(
      { error: "Missing stripe-signature header." },
      { status: 400 },
    );
  }

  // Read the raw body — Stripe signs the exact bytes.
  const rawBody = await request.text();

  let event: Stripe.Event;
  try {
    const stripe = getStripeClient();
    event = stripe.webhooks.constructEvent(rawBody, signature, webhookSecret);
  } catch (err) {
    console.error("Memora webhook: signature verification failed", err);
    return NextResponse.json(
      { error: "Invalid signature." },
      { status: 400 },
    );
  }

  let claim: "new" | "duplicate";
  try {
    claim = await claimStripeEvent(event.id, event.type);
  } catch (err) {
    console.error("Memora webhook: failed to record event claim", {
      eventId: event.id,
      type: event.type,
      err,
    });
    // Couldn't reach the idempotency table → tell Stripe to retry.
    return NextResponse.json({ error: "Idempotency check failed." }, { status: 500 });
  }

  if (claim === "duplicate") {
    console.info("Memora webhook: duplicate event ignored", {
      eventId: event.id,
      type: event.type,
    });
    return NextResponse.json({ received: true, duplicate: true });
  }

  try {
    switch (event.type) {
      case "checkout.session.completed": {
        await handleCheckoutCompleted(event.data.object as Stripe.Checkout.Session);
        break;
      }
      case "customer.subscription.created":
      case "customer.subscription.updated":
      case "customer.subscription.deleted": {
        await handleSubscription(event.data.object as Stripe.Subscription);
        break;
      }
      case "invoice.payment_succeeded":
      case "invoice.payment_failed": {
        // The subsequent customer.subscription.updated event carries the
        // canonical state; we just log here for audit/debugging.
        const invoice = event.data.object as Stripe.Invoice;
        console.info("Memora webhook: invoice event", {
          type: event.type,
          id: invoice.id,
          status: invoice.status,
          customer: invoice.customer,
        });
        break;
      }
      default:
        // Ignore — Stripe sends many event types we don't act on.
        break;
    }
    return NextResponse.json({ received: true });
  } catch (err) {
    console.error("Memora webhook: handler failed", { type: event.type, err });
    // Release the claim so Stripe's next retry can re-process this event.
    await releaseStripeEvent(event.id);
    // 5xx tells Stripe to retry.
    return NextResponse.json({ error: "Handler failed." }, { status: 500 });
  }
}
