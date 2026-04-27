import { NextResponse, type NextRequest } from "next/server";
import { buildAbsoluteAppUrl, getServerSiteOrigin } from "@/lib/site-url";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { getStripeClient } from "@/lib/stripe";

export const runtime = "nodejs";

export async function POST(request: NextRequest) {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();
  if (authError || !user) {
    return NextResponse.json({ error: "Not authenticated." }, { status: 401 });
  }

  const admin = createSupabaseAdminClient();
  const { data: profile, error: profileError } = await admin
    .from("profiles")
    .select("stripe_customer_id, is_internal_account")
    .eq("id", user.id)
    .maybeSingle<{
      stripe_customer_id: string | null;
      is_internal_account: boolean;
    }>();
  if (profileError) {
    console.error("Memora: portal session profile read failed", profileError);
    return NextResponse.json(
      { error: "Could not load your account." },
      { status: 500 },
    );
  }

  // Internal/founder accounts: graceful no-op response instead of an error.
  if (profile?.is_internal_account && !profile.stripe_customer_id) {
    return NextResponse.json(
      {
        ok: true,
        kind: "internal",
        message:
          "This account already has full access. No billing management is required.",
      },
      { status: 200 },
    );
  }

  if (!profile?.stripe_customer_id) {
    return NextResponse.json(
      {
        ok: false,
        kind: "no-customer",
        message:
          "Choose a paid plan first to access billing management.",
      },
      { status: 400 },
    );
  }

  const origin = getServerSiteOrigin(request.headers.get("origin"));
  const returnUrl = buildAbsoluteAppUrl("/galleries/settings", origin);

  try {
    const stripe = getStripeClient();
    const session = await stripe.billingPortal.sessions.create({
      customer: profile.stripe_customer_id,
      return_url: returnUrl,
    });
    return NextResponse.json({ ok: true, url: session.url });
  } catch (err) {
    console.error("Memora: stripe portal session create failed", err);
    return NextResponse.json(
      { error: "Could not open billing portal." },
      { status: 500 },
    );
  }
}
