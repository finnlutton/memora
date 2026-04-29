import { NextResponse, type NextRequest } from "next/server";
import { sanitizeDisplayName } from "@/lib/profile-state";
import { createSupabaseServerClient } from "@/lib/supabase/server";

/**
 * Marks the user as having completed the welcome step. Now also
 * persists the display name they entered on /welcome — without one,
 * the user is held at /welcome by the onboarding gate.
 */

type WelcomeCompletePayload = {
  displayName?: string;
};

export async function POST(request: NextRequest) {
  try {
    const supabase = await createSupabaseServerClient();
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: "Not authenticated." }, { status: 401 });
    }

    let payload: WelcomeCompletePayload = {};
    try {
      payload = (await request.json()) as WelcomeCompletePayload;
    } catch {
      // Body is optional only for tests / clients that defaulted to
      // POST without a payload — the validation below still requires
      // a name, so an empty body errors out.
    }

    const sanitizedName = sanitizeDisplayName(payload.displayName);
    if (!sanitizedName) {
      return NextResponse.json(
        { error: "Please enter a name we can call you by." },
        { status: 400 },
      );
    }

    const updateAttempt = await supabase
      .from("profiles")
      .update({
        has_seen_welcome: true,
        display_name: sanitizedName,
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
        display_name: sanitizedName,
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

    return NextResponse.json({ ok: true, displayName: sanitizedName }, { status: 200 });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Unable to complete welcome step." },
      { status: 500 },
    );
  }
}
