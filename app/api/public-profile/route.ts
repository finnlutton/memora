import { NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import {
  sanitizePublicBio,
  sanitizePublicDisplayName,
  sanitizePublicTheme,
  validateHandle,
} from "@/lib/public-profile";

type ProfileRow = {
  public_handle: string | null;
  public_display_name: string | null;
  public_bio: string | null;
  is_public_profile_enabled: boolean | null;
  public_profile_theme_id: string | null;
};

const PROFILE_COLUMNS =
  "public_handle, public_display_name, public_bio, is_public_profile_enabled, public_profile_theme_id";

function publicProfilePayload(row: ProfileRow | null) {
  return {
    handle: row?.public_handle ?? null,
    displayName: row?.public_display_name ?? null,
    bio: row?.public_bio ?? null,
    enabled: Boolean(row?.is_public_profile_enabled),
    themeId: row?.public_profile_theme_id ?? null,
  };
}

export async function GET() {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Not authenticated." }, { status: 401 });
  }

  const { data, error } = await supabase
    .from("profiles")
    .select(PROFILE_COLUMNS)
    .eq("id", user.id)
    .maybeSingle<ProfileRow>();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json(publicProfilePayload(data ?? null));
}

// PATCH accepts a partial — any field omitted from the body is left
// unchanged. `enabled: true` requires a handle to be set (either now or
// already on file). Handle uniqueness is enforced by the partial unique
// index in the migration; we surface a friendly error on conflict.
export async function PATCH(request: Request) {
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

  if (!body || typeof body !== "object") {
    return NextResponse.json({ error: "Invalid request body." }, { status: 400 });
  }

  const input = body as Record<string, unknown>;
  const update: Record<string, unknown> = {};

  if ("handle" in input) {
    if (input.handle === null || input.handle === "") {
      // Allow clearing the handle ONLY if the profile is being disabled
      // in the same request. Otherwise the public page would 404.
      const willBeDisabled =
        ("enabled" in input && input.enabled === false) ||
        // current state will be checked below if "enabled" is omitted
        false;
      if (!willBeDisabled) {
        return NextResponse.json(
          { error: "Disable your public page before clearing your handle." },
          { status: 400 },
        );
      }
      update.public_handle = null;
    } else {
      const result = validateHandle(input.handle);
      if (!result.ok) {
        return NextResponse.json({ error: result.message }, { status: 400 });
      }
      update.public_handle = result.handle;
    }
  }

  if ("displayName" in input) {
    update.public_display_name = sanitizePublicDisplayName(input.displayName);
  }

  if ("bio" in input) {
    update.public_bio = sanitizePublicBio(input.bio);
  }

  if ("themeId" in input) {
    // null/invalid both fall through to NULL = "use app default" — no
    // need to surface a separate error to the user.
    update.public_profile_theme_id = sanitizePublicTheme(input.themeId);
  }

  if ("enabled" in input) {
    if (typeof input.enabled !== "boolean") {
      return NextResponse.json(
        { error: "`enabled` must be a boolean." },
        { status: 400 },
      );
    }
    update.is_public_profile_enabled = input.enabled;
  }

  // Enforce: cannot enable without a handle.
  if (update.is_public_profile_enabled === true) {
    const handleAfterUpdate =
      "public_handle" in update
        ? (update.public_handle as string | null)
        : null;
    if (!handleAfterUpdate) {
      const { data: existing } = await supabase
        .from("profiles")
        .select("public_handle")
        .eq("id", user.id)
        .maybeSingle<{ public_handle: string | null }>();
      if (!existing?.public_handle) {
        return NextResponse.json(
          { error: "Pick a handle before enabling your public page." },
          { status: 400 },
        );
      }
    }
  }

  if (Object.keys(update).length === 0) {
    return NextResponse.json(
      { error: "No fields to update." },
      { status: 400 },
    );
  }

  const { data, error } = await supabase
    .from("profiles")
    .update(update)
    .eq("id", user.id)
    .select(PROFILE_COLUMNS)
    .maybeSingle<ProfileRow>();

  if (error) {
    // 23505 = unique_violation on profiles_public_handle_unique
    if (error.code === "23505") {
      return NextResponse.json(
        { error: "That handle is already taken." },
        { status: 409 },
      );
    }
    // 23514 = check_violation (handle format / reserved list / length caps)
    if (error.code === "23514") {
      return NextResponse.json(
        { error: "That value isn't allowed. Try a different one." },
        { status: 400 },
      );
    }
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json(publicProfilePayload(data ?? null));
}

export const dynamic = "force-dynamic";
