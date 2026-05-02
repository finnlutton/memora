import { NextResponse, type NextRequest } from "next/server";
import {
  getStripePriceIdForPlan,
  isInternalPlan,
  isPaidPlan,
  membershipPlans,
  normalizePlanId,
  type MembershipPlanId,
} from "@/lib/plans";
import { checkRateLimit } from "@/lib/rate-limit";
import { buildAbsoluteAppUrl, getServerSiteOrigin } from "@/lib/site-url";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { getStripeClient } from "@/lib/stripe";

export const runtime = "nodejs";

export async function POST(request: NextRequest) {
  // 1. Authenticate the caller via the Supabase SSR client.
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();
  if (authError || !user) {
    return NextResponse.json({ error: "Not authenticated." }, { status: 401 });
  }

  const rate = await checkRateLimit(request, {
    name: "stripe-checkout-session",
    limit: 10,
    window: "1 m",
    key: user.id,
  });
  if (!rate.allowed) return rate.response;

  // 2. Parse + validate the request body. The client only sends planId.
  const body = (await request.json().catch(() => null)) as { planId?: string } | null;
  const requestedPlanId = body?.planId;
  if (!requestedPlanId) {
    return NextResponse.json({ error: "planId is required." }, { status: 400 });
  }
  const planId = normalizePlanId(requestedPlanId) as MembershipPlanId;
  const known = membershipPlans.find((p) => p.id === planId);
  if (!known) {
    return NextResponse.json({ error: "Unknown plan." }, { status: 400 });
  }
  if (isInternalPlan(planId)) {
    return NextResponse.json(
      { error: "Internal plans are not purchasable." },
      { status: 400 },
    );
  }
  if (!isPaidPlan(planId)) {
    return NextResponse.json(
      { error: "Free plan does not require checkout." },
      { status: 400 },
    );
  }

  // 3. Read the user's billing state. Internal accounts skip Stripe entirely.
  const admin = createSupabaseAdminClient();
  const { data: profile, error: profileError } = await admin
    .from("profiles")
    .select(
      "id, email, stripe_customer_id, is_internal_account, selected_plan",
    )
    .eq("id", user.id)
    .maybeSingle<{
      id: string;
      email: string | null;
      stripe_customer_id: string | null;
      is_internal_account: boolean;
      selected_plan: string | null;
    }>();
  if (profileError) {
    console.error("Memora: stripe checkout profile read failed", profileError);
    return NextResponse.json(
      { error: "Could not load your account." },
      { status: 500 },
    );
  }
  if (profile?.is_internal_account) {
    return NextResponse.json(
      {
        error:
          "This account already has full access and does not require billing.",
      },
      { status: 400 },
    );
  }

  // 4. Resolve Stripe price + create-or-reuse customer.
  let priceId: string;
  try {
    priceId = getStripePriceIdForPlan(planId);
  } catch (err) {
    console.error("Memora: stripe price env missing", err);
    return NextResponse.json(
      { error: "Plan not currently available for purchase." },
      { status: 500 },
    );
  }

  const stripe = getStripeClient();
  let customerId = profile?.stripe_customer_id ?? null;
  if (!customerId) {
    const customer = await stripe.customers.create({
      email: profile?.email ?? user.email ?? undefined,
      metadata: { user_id: user.id },
    });
    customerId = customer.id;
    const { error: updateError } = await admin
      .from("profiles")
      .update({ stripe_customer_id: customerId })
      .eq("id", user.id);
    if (updateError) {
      console.error(
        "Memora: failed to persist stripe_customer_id",
        updateError,
      );
      // Continue — the webhook will reconcile.
    }
  }

  // 5. Build success/cancel URLs. NEXT_PUBLIC_SITE_URL takes precedence;
  // fall back to the request origin so previews still work.
  const origin = getServerSiteOrigin(request.headers.get("origin"));
  const successUrl = buildAbsoluteAppUrl(
    "/galleries?checkout=success",
    origin,
  );
  const cancelUrl = buildAbsoluteAppUrl(
    "/galleries/settings/membership?checkout=cancelled",
    origin,
  );

  // 6. Create the Checkout Session. Subscription mode for Plus/Max,
  // payment mode (one-time) for Lifetime.
  const mode = known.stripeMode ?? "subscription";
  try {
    const session = await stripe.checkout.sessions.create({
      mode,
      customer: customerId,
      line_items: [{ price: priceId, quantity: 1 }],
      allow_promotion_codes: true,
      client_reference_id: user.id,
      metadata: { user_id: user.id, plan_id: planId },
      ...(mode === "subscription"
        ? {
            subscription_data: {
              metadata: { user_id: user.id, plan_id: planId },
            },
          }
        : {
            // For one-time lifetime payments, attach metadata to the
            // resulting payment intent so the webhook can identify it.
            payment_intent_data: {
              metadata: { user_id: user.id, plan_id: planId },
            },
          }),
      success_url: successUrl,
      cancel_url: cancelUrl,
    });
    return NextResponse.json({ url: session.url });
  } catch (err) {
    console.error("Memora: stripe checkout session create failed", err);
    return NextResponse.json(
      { error: "Could not create checkout session." },
      { status: 500 },
    );
  }
}
