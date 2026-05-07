import { NextResponse, type NextRequest } from "next/server";
import { isAdminEmail } from "@/lib/admin/access";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { createSupabaseServerClient } from "@/lib/supabase/server";

/**
 * POST /api/admin/ambassador-commissions/:id/mark-paid
 *
 * Marks a single commission row as `paid`, stamping the admin's email
 * for audit. Only `pending` rows can transition — already-paid rows
 * idempotently succeed (so a double-click doesn't 500), and refunded
 * or void rows return 409 since paying them out would be a mistake.
 */

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

type CommissionStatusRow = {
  id: string;
  status: string;
};

export async function POST(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await params;
    if (!id || !UUID_RE.test(id)) {
      return NextResponse.json(
        { error: "Invalid commission id." },
        { status: 400 },
      );
    }

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

    const admin = createSupabaseAdminClient();

    const { data: existing, error: readError } = await admin
      .from("ambassador_commissions")
      .select("id, status")
      .eq("id", id)
      .maybeSingle<CommissionStatusRow>();
    if (readError) {
      console.error("Memora admin: commission read failed", readError);
      return NextResponse.json({ error: readError.message }, { status: 500 });
    }
    if (!existing) {
      return NextResponse.json({ error: "Not found." }, { status: 404 });
    }

    if (existing.status === "paid") {
      return NextResponse.json({ ok: true, status: "paid", changed: false });
    }
    if (existing.status !== "pending") {
      return NextResponse.json(
        {
          error: `Cannot mark a ${existing.status} commission as paid. Only pending rows can be paid out.`,
        },
        { status: 409 },
      );
    }

    const { error: updateError } = await admin
      .from("ambassador_commissions")
      .update({
        status: "paid",
        paid_at: new Date().toISOString(),
        paid_by_admin_email: user.email ?? null,
      })
      .eq("id", id)
      .eq("status", "pending");
    if (updateError) {
      console.error("Memora admin: commission mark-paid failed", updateError);
      return NextResponse.json({ error: updateError.message }, { status: 500 });
    }

    return NextResponse.json({ ok: true, status: "paid", changed: true });
  } catch (err) {
    console.error("Memora admin: commission mark-paid error", err);
    return NextResponse.json(
      { error: "Could not mark commission as paid." },
      { status: 500 },
    );
  }
}
