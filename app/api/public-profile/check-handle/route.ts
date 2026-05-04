import { NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { validateHandle } from "@/lib/public-profile";

// Live availability check the Settings form fires on blur. Returns
// { available, reason } so the form can render an inline status without
// having to attempt a save. The PATCH endpoint still re-validates on
// write — this is purely UX.
export async function POST(request: Request) {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Not authenticated." }, { status: 401 });
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body." }, { status: 400 });
  }

  const handleInput =
    body && typeof body === "object"
      ? (body as { handle?: unknown }).handle
      : undefined;

  const result = validateHandle(handleInput);
  if (!result.ok) {
    return NextResponse.json({
      available: false,
      reason: result.reason,
      message: result.message,
    });
  }

  // A user reusing their own current handle is "available" — they
  // haven't taken it from anyone.
  const { data: clash, error } = await supabase
    .from("profiles")
    .select("id")
    .eq("public_handle", result.handle)
    .neq("id", user.id)
    .maybeSingle<{ id: string }>();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  if (clash) {
    return NextResponse.json({
      available: false,
      reason: "taken",
      message: "That handle is already taken.",
    });
  }

  return NextResponse.json({ available: true, handle: result.handle });
}

export const dynamic = "force-dynamic";
