// Server-side loaders for the public Memora page tree (/@handle, the
// gallery view, and the subgallery view). Each helper returns a
// fully-validated object or null so callers can immediately notFound()
// without thinking about the access-control rules.
//
// Access rules (mirrors the migration):
//   - Profile is visible iff is_public_profile_enabled = true.
//   - Gallery is visible iff its owner's profile is visible AND
//     galleries.is_on_public_profile = true.
//   - A subgallery is visible iff its parent gallery is visible.
//
// All reads use the service-role admin client. RLS on these tables
// stays owner-scoped; we never widen public anon-key access.

import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { RESERVED_HANDLES, validateHandle } from "@/lib/public-profile";
import { isThemeId, type ThemeId } from "@/lib/theme";

export type PublicProfile = {
  id: string;
  handle: string;
  displayName: string | null;
  bio: string | null;
  themeId: ThemeId | null;
};

export type PublicGalleryRow = {
  id: string;
  title: string;
  description: string | null;
  cover_image_path: string | null;
  start_date: string | null;
  end_date: string | null;
  location: string | null;
  locations: string[] | null;
  updated_at: string;
};

export type PublicSubgalleryRow = {
  id: string;
  gallery_id: string;
  title: string;
  description: string | null;
  cover_image_path: string | null;
  location: string | null;
  date_label: string | null;
  start_date: string | null;
  end_date: string | null;
};

export type PublicPhotoRow = {
  id: string;
  storage_path: string;
  caption: string | null;
  display_order: number | null;
  created_at: string;
};

// Pull the bare handle out of a `[handle]` URL segment. Requires the
// segment to start with '@' so /random-string can't trigger a profile
// lookup. Reserved handles are rejected here as a defensive backstop.
export function extractHandleFromSegment(rawSegment: string): string | null {
  let decoded: string;
  try {
    decoded = decodeURIComponent(rawSegment);
  } catch {
    return null;
  }
  if (!decoded.startsWith("@")) return null;
  const handle = decoded.slice(1).toLowerCase();
  if (RESERVED_HANDLES.has(handle)) return null;
  const validation = validateHandle(handle);
  return validation.ok ? validation.handle : null;
}

// Loads the profile only if the public page is enabled. Returning null
// from this function means: notFound(). For the disabled-but-exists
// case, the caller should use loadProfileForHandle (without the enabled
// gate) to render the "page is not public" empty state.
export async function loadEnabledProfileForHandle(
  handle: string,
): Promise<PublicProfile | null> {
  const admin = createSupabaseAdminClient();
  const { data } = await admin
    .from("profiles")
    .select(
      "id, public_handle, public_display_name, public_bio, is_public_profile_enabled, public_profile_theme_id",
    )
    .eq("public_handle", handle)
    .eq("is_public_profile_enabled", true)
    .maybeSingle<{
      id: string;
      public_handle: string;
      public_display_name: string | null;
      public_bio: string | null;
      is_public_profile_enabled: boolean;
      public_profile_theme_id: string | null;
    }>();

  if (!data) return null;
  return {
    id: data.id,
    handle: data.public_handle,
    displayName: data.public_display_name,
    bio: data.public_bio,
    themeId: isThemeId(data.public_profile_theme_id)
      ? data.public_profile_theme_id
      : null,
  };
}

// Loads the profile regardless of enabled state — used by the /@handle
// page itself to distinguish "profile exists but is disabled" from
// "no such handle".
export async function loadProfileForHandle(handle: string) {
  const admin = createSupabaseAdminClient();
  const { data } = await admin
    .from("profiles")
    .select(
      "id, public_handle, public_display_name, public_bio, is_public_profile_enabled, public_profile_theme_id",
    )
    .eq("public_handle", handle)
    .maybeSingle<{
      id: string;
      public_handle: string;
      public_display_name: string | null;
      public_bio: string | null;
      is_public_profile_enabled: boolean;
      public_profile_theme_id: string | null;
    }>();

  if (!data) return null;
  return {
    id: data.id,
    handle: data.public_handle,
    displayName: data.public_display_name,
    bio: data.public_bio,
    enabled: data.is_public_profile_enabled,
    themeId: isThemeId(data.public_profile_theme_id)
      ? data.public_profile_theme_id
      : null,
  };
}

// Loads a single public gallery — owner must have an enabled profile,
// and the gallery itself must be flagged for the public page.
export async function loadPublicGallery(
  handle: string,
  galleryId: string,
): Promise<{ profile: PublicProfile; gallery: PublicGalleryRow } | null> {
  const profile = await loadEnabledProfileForHandle(handle);
  if (!profile) return null;

  const admin = createSupabaseAdminClient();
  const { data } = await admin
    .from("galleries")
    .select(
      "id, title, description, cover_image_path, start_date, end_date, location, locations, updated_at",
    )
    .eq("id", galleryId)
    .eq("user_id", profile.id)
    .eq("is_on_public_profile", true)
    .maybeSingle<PublicGalleryRow>();

  if (!data) return null;
  return { profile, gallery: data };
}

export function isLikelyStoragePath(path: string) {
  return (
    !path.startsWith("data:") &&
    !path.startsWith("blob:") &&
    !path.startsWith("/") &&
    !path.startsWith("http")
  );
}
