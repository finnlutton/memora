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

    const updateAttempt = await supabase
      .from("profiles")
      .update({
        has_seen_welcome: true,
        email: user.email ?? null,
        selected_plan: "free",
      })
      .eq("id", user.id)
      .select("id")
      .maybeSingle();

    if (updateAttempt.error) {
      return NextResponse.json(
        {
          error: updateAttempt.error.message,
          code: updateAttempt.error.code,
          details: updateAttempt.error.details,
          hint: updateAttempt.error.hint,
          action: "profiles_update",
        },
        { status: 500 },
      );
    }

    if (!updateAttempt.data) {
      const insertAttempt = await supabase.from("profiles").insert({
        id: user.id,
        email: user.email ?? null,
        has_seen_welcome: true,
        selected_plan: "free",
      });
      if (insertAttempt.error) {
        return NextResponse.json(
          {
            error: insertAttempt.error.message,
            code: insertAttempt.error.code,
            details: insertAttempt.error.details,
            hint: insertAttempt.error.hint,
            action: "profiles_insert",
          },
          { status: 500 },
        );
      }
    }

    return NextResponse.json({ ok: true }, { status: 200 });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Unable to complete welcome step." },
      { status: 500 },
    );
  }
}
