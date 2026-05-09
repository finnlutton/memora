import { NextResponse } from "next/server";
import {
  isAbroadPassExpired,
  isMaxExpired,
  isMemoraPassExpired,
  resolveEffectivePlanId,
  type MembershipPlanId,
} from "@/lib/plans";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export const runtime = "nodejs";

export type BillingStatusResponse = {
  /** Effective plan after one-time-plan expiry resolution. */
  planId: MembershipPlanId;
  isInternal: boolean;
  hasStripeCustomer: boolean;
  subscriptionStatus: string | null;
  /**
   * For monthly subs:           next renewal date.
   * For an active Memora Pass:  when the 1-year window ends.
   * For an active Abroad Pass:  when the 6-month window ends.
   * For a legacy active Max:    when the 3-year term ends.
   * Null for Free, internal, or any expired one-time plan.
   */
  currentPeriodEnd: string | null;
  cancelAtPeriodEnd: boolean;
  /**
   * True when the stored plan is `lifetime` (legacy 3-year Max) but the
   * access window has elapsed. The `planId` above is downgraded to
   * `"free"` in that case; this flag lets the UI surface a "Max access
   * ended" state instead of a generic Free state.
   */
  maxExpired: boolean;
  /**
   * True when the stored plan is `abroad_pass` but the 6-month creation
   * window has elapsed. Lets the UI render the warm "your Abroad Pass
   * period has ended" state — galleries stay viewable, new uploads
   * require an active plan.
   */
  abroadPassExpired: boolean;
  /**
   * True when the stored plan is `memora_pass` but the 1-year window
   * has elapsed. Lets the UI render the "your Memora Pass has ended"
   * state — galleries stay viewable, new uploads require an active plan.
   */
  memoraPassExpired: boolean;
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
  const maxExpired = isMaxExpired(planFields);
  const abroadPassExpired = isAbroadPassExpired(planFields);
  const memoraPassExpired = isMemoraPassExpired(planFields);
  const oneTimeExpired = maxExpired || abroadPassExpired || memoraPassExpired;

  const body: BillingStatusResponse = {
    planId,
    isInternal: Boolean(profile?.is_internal_account),
    hasStripeCustomer: Boolean(profile?.stripe_customer_id),
    subscriptionStatus: profile?.subscription_status ?? null,
    // Hide the stale end-date once a one-time plan's window has lapsed
    // — the UI shouldn't render "ends on (yesterday)".
    currentPeriodEnd: oneTimeExpired
      ? null
      : profile?.subscription_current_period_end ?? null,
    cancelAtPeriodEnd: Boolean(profile?.subscription_cancel_at_period_end),
    maxExpired,
    abroadPassExpired,
    memoraPassExpired,
  };
  return NextResponse.json(body);
}
