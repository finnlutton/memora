import { NextResponse, type NextRequest } from "next/server";
import { isAdminEmail } from "@/lib/admin/access";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { createSupabaseServerClient } from "@/lib/supabase/server";

/**
 * GET /api/admin/ambassador-commissions
 *
 * Lists ambassador commission rows for the admin panel. No pagination
 * yet — early ambassador volume is small enough that a single ordered
 * fetch with a generous cap is fine. Optional `status` query param
 * filters to one of pending / paid / void / refunded; omitted returns
 * everything.
 *
 * Returns ambassadors joined inline so the UI can render the name +
 * promotion code per row without a second round-trip. Buyer email is
 * resolved through the profiles join.
 */

const MAX_ROWS = 500;
const VALID_STATUSES = new Set(["pending", "paid", "void", "refunded"]);

type CommissionRow = {
  id: string;
  ambassador_id: string;
  buyer_user_id: string | null;
  stripe_event_id: string;
  stripe_session_id: string | null;
  stripe_invoice_id: string | null;
  stripe_payment_intent_id: string | null;
  stripe_charge_id: string | null;
  source: string;
  plan_id: string | null;
  payment_amount_cents: number;
  commission_amount_cents: number;
  currency: string;
  status: string;
  notes: string | null;
  created_at: string;
  paid_at: string | null;
  paid_by_admin_email: string | null;
  voided_at: string | null;
  refunded_at: string | null;
  ambassadors: {
    id: string;
    name: string;
    email: string | null;
    promotion_code: string;
    commission_rate: number;
    active: boolean;
  } | null;
  profiles: {
    id: string;
    email: string | null;
  } | null;
};

export async function GET(request: NextRequest) {
  try {
    const supabase = await createSupabaseServerClient();
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: "Not authenticated." }, { status: 401 });
    }
    if (!isAdminEmail(user.email)) {
      return NextResponse.json({ error: "Forbidden." }, { status: 403 });
    }

    const url = new URL(request.url);
    const statusParam = url.searchParams.get("status")?.trim().toLowerCase();
    const statusFilter = statusParam && VALID_STATUSES.has(statusParam) ? statusParam : null;

    const admin = createSupabaseAdminClient();

    let query = admin
      .from("ambassador_commissions")
      .select(
        "id, ambassador_id, buyer_user_id, stripe_event_id, stripe_session_id, stripe_invoice_id, stripe_payment_intent_id, stripe_charge_id, source, plan_id, payment_amount_cents, commission_amount_cents, currency, status, notes, created_at, paid_at, paid_by_admin_email, voided_at, refunded_at, ambassadors!inner(id, name, email, promotion_code, commission_rate, active), profiles(id, email)",
      )
      .order("created_at", { ascending: false })
      .limit(MAX_ROWS);

    if (statusFilter) {
      query = query.eq("status", statusFilter);
    }

    const { data, error } = await query;
    if (error) {
      console.error("Memora admin: commission list failed", error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    const rows = (data ?? []) as unknown as CommissionRow[];

    // Aggregate totals by status so the UI can render headline numbers
    // without a second query.
    const totals: Record<string, { count: number; commissionCents: number }> = {
      pending: { count: 0, commissionCents: 0 },
      paid: { count: 0, commissionCents: 0 },
      void: { count: 0, commissionCents: 0 },
      refunded: { count: 0, commissionCents: 0 },
    };
    for (const row of rows) {
      const bucket = totals[row.status];
      if (bucket) {
        bucket.count += 1;
        bucket.commissionCents += row.commission_amount_cents;
      }
    }

    const commissions = rows.map((row) => ({
      id: row.id,
      ambassador: row.ambassadors
        ? {
            id: row.ambassadors.id,
            name: row.ambassadors.name,
            email: row.ambassadors.email,
            promotionCode: row.ambassadors.promotion_code,
            commissionRate: row.ambassadors.commission_rate,
            active: row.ambassadors.active,
          }
        : null,
      buyerEmail: row.profiles?.email ?? null,
      buyerUserId: row.buyer_user_id,
      source: row.source,
      planId: row.plan_id,
      paymentAmountCents: row.payment_amount_cents,
      commissionAmountCents: row.commission_amount_cents,
      currency: row.currency,
      status: row.status,
      notes: row.notes,
      createdAt: row.created_at,
      paidAt: row.paid_at,
      paidByAdminEmail: row.paid_by_admin_email,
      voidedAt: row.voided_at,
      refundedAt: row.refunded_at,
      stripeRefs: {
        eventId: row.stripe_event_id,
        sessionId: row.stripe_session_id,
        invoiceId: row.stripe_invoice_id,
        paymentIntentId: row.stripe_payment_intent_id,
        chargeId: row.stripe_charge_id,
      },
    }));

    return NextResponse.json({
      commissions,
      totals,
      cappedAt: rows.length === MAX_ROWS ? MAX_ROWS : null,
    });
  } catch (err) {
    console.error("Memora admin: commission list error", err);
    return NextResponse.json(
      { error: "Could not load commissions." },
      { status: 500 },
    );
  }
}
