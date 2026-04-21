import { NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export async function POST() {
  try {
    const supabase = await createSupabaseServerClient();
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: "Not authenticated." }, { status: 401 });
    }

    const revokedAt = new Date().toISOString();
    const { data, error } = await supabase
      .from("shares")
      .update({ revoked_at: revokedAt })
      .eq("owner_user_id", user.id)
      .is("revoked_at", null)
      .select("id");

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    const revokedCount = (data ?? []).length;
    console.info("Memora: user revoked all shares", { userId: user.id, revokedCount });
    return NextResponse.json({ revokedCount }, { status: 200 });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Unable to revoke share links." },
      { status: 500 },
    );
  }
}
