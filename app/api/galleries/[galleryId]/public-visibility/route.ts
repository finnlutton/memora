import { NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase/server";

// GET /api/galleries/:galleryId/public-visibility
//
// Returns the gallery's current `is_on_public_profile` flag plus the
// owner's public-profile state. Lets the per-gallery sharing dialog
// render the right hint ("Public page is off — go enable it") without
// the client needing two separate fetches.
export async function GET(
  _request: Request,
  { params }: { params: Promise<{ galleryId: string }> },
) {
  const { galleryId } = await params;
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Not authenticated." }, { status: 401 });
  }

  const [galleryResult, profileResult] = await Promise.all([
    supabase
      .from("galleries")
      .select("id, is_on_public_profile")
      .eq("id", galleryId)
      .eq("user_id", user.id)
      .maybeSingle<{ id: string; is_on_public_profile: boolean }>(),
    supabase
      .from("profiles")
      .select("public_handle, is_public_profile_enabled")
      .eq("id", user.id)
      .maybeSingle<{
        public_handle: string | null;
        is_public_profile_enabled: boolean | null;
      }>(),
  ]);

  if (galleryResult.error) {
    return NextResponse.json(
      { error: galleryResult.error.message },
      { status: 500 },
    );
  }
  if (!galleryResult.data) {
    return NextResponse.json({ error: "Gallery not found." }, { status: 404 });
  }
  if (profileResult.error) {
    return NextResponse.json(
      { error: profileResult.error.message },
      { status: 500 },
    );
  }

  return NextResponse.json({
    galleryId: galleryResult.data.id,
    onPublicProfile: galleryResult.data.is_on_public_profile,
    profile: {
      handle: profileResult.data?.public_handle ?? null,
      enabled: Boolean(profileResult.data?.is_public_profile_enabled),
    },
  });
}

// PATCH /api/galleries/:galleryId/public-visibility { onPublicProfile: boolean }
//
// Toggles `galleries.is_on_public_profile` for a gallery the caller
// owns. The /@handle page only renders this gallery if BOTH this flag
// AND the owner's `is_public_profile_enabled` are true — so toggling
// here while the public page is disabled is fine, the gallery just
// won't appear anywhere until the page is also enabled.
export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ galleryId: string }> },
) {
  const { galleryId } = await params;
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

  const onPublicProfile =
    body && typeof body === "object"
      ? (body as { onPublicProfile?: unknown }).onPublicProfile
      : undefined;

  if (typeof onPublicProfile !== "boolean") {
    return NextResponse.json(
      { error: "`onPublicProfile` must be a boolean." },
      { status: 400 },
    );
  }

  const { data, error } = await supabase
    .from("galleries")
    .update({ is_on_public_profile: onPublicProfile })
    .eq("id", galleryId)
    .eq("user_id", user.id)
    .select("id, is_on_public_profile")
    .maybeSingle<{ id: string; is_on_public_profile: boolean }>();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
  if (!data) {
    return NextResponse.json(
      { error: "Gallery not found." },
      { status: 404 },
    );
  }

  return NextResponse.json({
    galleryId: data.id,
    onPublicProfile: data.is_on_public_profile,
  });
}

export const dynamic = "force-dynamic";
