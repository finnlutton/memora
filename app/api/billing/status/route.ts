import { NextResponse } from "next/server";
import {
  isFounderExpired,
  resolveEffectivePlanId,
  type MembershipPlanId,
} from "@/lib/plans";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export const runtime = "nodejs";

export type BillingStatusResponse = {
  /** Effective plan after Founder Plan expiry resolution. */
  planId: MembershipPlanId;
  isInternal: boolean;
  hasStripeCustomer: boolean;
  subscriptionStatus: string | null;
  /**
   * For monthly subs: next renewal date.
   * For an active Founder Plan: when 5-year access ends.
   * Null for Free, internal, or expired Founder.
   */
  currentPeriodEnd: string | null;
  cancelAtPeriodEnd: boolean;
  /**
   * True when the stored plan is `lifetime` (Founder) but the access
   * window has elapsed. The `planId` above is downgraded to `"free"` in
   * that case; this flag lets the UI surface a "Founder access ended"
   * state instead of a generic Free state.
   */
  founderExpired: boolean;
};

/**
 * GET /api/billing/status
 *
 * Returns the authenticated user's plan + Stripe billing state in a
 * client-friendly shape. Does NOT expose any Stripe IDs — only the
 * fields the UI needs to render the status card and plan-aware buttons.
 */
export async function GET() {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();
  if (authError || !user) {
    return NextResponse.json({ error: "Not authenticated." }, { status: 401 });
  }

  const { data: profile, error } = await supabase
    .from("profiles")
    .select(
      "selected_plan, is_internal_account, stripe_customer_id, subscription_status, subscription_current_period_end, subscription_cancel_at_period_end",
    )
    .eq("id", user.id)
    .maybeSingle<{
      selected_plan: string | null;
      is_internal_account: boolean | null;
      stripe_customer_id: string | null;
      subscription_status: string | null;
      subscription_current_period_end: string | null;
      subscription_cancel_at_period_end: boolean | null;
    }>();
  if (error) {
    console.error("Memora: billing status profile read failed", error);
    return NextResponse.json(
      { error: "Could not load billing status." },
      { status: 500 },
    );
  }

  const planFields = {
    selected_plan: profile?.selected_plan ?? null,
    is_internal_account: profile?.is_internal_account ?? null,
    subscription_current_period_end:
      profile?.subscription_current_period_end ?? null,
  };
  const planId = resolveEffectivePlanId(planFields);
  const founderExpired = isFounderExpired(planFields);

  const body: BillingStatusResponse = {
    planId,
    isInternal: Boolean(profile?.is_internal_account),
    hasStripeCustomer: Boolean(profile?.stripe_customer_id),
    subscriptionStatus: profile?.subscription_status ?? null,
    // Hide the stale end-date once the Founder term has lapsed — the UI
    // shouldn't render "ends on (yesterday)".
    currentPeriodEnd: founderExpired
      ? null
      : profile?.subscription_current_period_end ?? null,
    cancelAtPeriodEnd: Boolean(profile?.subscription_cancel_at_period_end),
    founderExpired,
  };
  return NextResponse.json(body);
}
