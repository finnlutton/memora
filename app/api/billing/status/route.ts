import { NextResponse } from "next/server";
import { normalizePlanId, type MembershipPlanId } from "@/lib/plans";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export const runtime = "nodejs";

export type BillingStatusResponse = {
  planId: MembershipPlanId;
  isInternal: boolean;
  hasStripeCustomer: boolean;
  subscriptionStatus: string | null;
  currentPeriodEnd: string | null;
  cancelAtPeriodEnd: boolean;
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

  const planId: MembershipPlanId = profile?.is_internal_account
    ? "internal"
    : normalizePlanId(profile?.selected_plan ?? null);

  const body: BillingStatusResponse = {
    planId,
    isInternal: Boolean(profile?.is_internal_account),
    hasStripeCustomer: Boolean(profile?.stripe_customer_id),
    subscriptionStatus: profile?.subscription_status ?? null,
    currentPeriodEnd: profile?.subscription_current_period_end ?? null,
    cancelAtPeriodEnd: Boolean(profile?.subscription_cancel_at_period_end),
  };
  return NextResponse.json(body);
}
