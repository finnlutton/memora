import { NextResponse } from "next/server";
import { IMAGE_SIGNED_URL_TTL_SECONDS } from "@/lib/storage";
import { createSupabaseServerClient } from "@/lib/supabase/server";

// GET /api/public-profile/galleries
//
// Returns the caller's galleries with their is_on_public_profile flag
// and a signed cover URL, so the Settings picker can render thumbnails
// without a second round trip. Everything stays on the user's auth
// client — owner-scoped read for the rows, and the existing storage
// RLS lets the same session sign URLs for its own files. (No admin
// client here because the data is per-user, not public.)

const STORAGE_BUCKET = "gallery-images";

type GalleryRow = {
  id: string;
  title: string;
  cover_image_path: string | null;
  start_date: string | null;
  end_date: string | null;
  is_on_public_profile: boolean;
};

function isLikelyStoragePath(path: string) {
  return (
    !path.startsWith("data:") &&
    !path.startsWith("blob:") &&
    !path.startsWith("/") &&
    !path.startsWith("http")
  );
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
    .from("galleries")
    .select(
      "id, title, cover_image_path, start_date, end_date, is_on_public_profile",
    )
    .eq("user_id", user.id)
    .order("start_date", { ascending: false, nullsFirst: false })
    .order("updated_at", { ascending: false })
    .returns<GalleryRow[]>();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  const rows = data ?? [];
  const coverPaths = rows
    .map((row) => row.cover_image_path)
    .filter((path): path is string => path !== null && isLikelyStoragePath(path));

  const signedByPath = new Map<string, string>();
  if (coverPaths.length) {
    const unique = Array.from(new Set(coverPaths));
    const { data: signed } = await supabase.storage
      .from(STORAGE_BUCKET)
      .createSignedUrls(unique, IMAGE_SIGNED_URL_TTL_SECONDS);
    (signed ?? []).forEach((entry, i) => {
      if (entry.signedUrl) signedByPath.set(unique[i], entry.signedUrl);
    });
  }

  return NextResponse.json({
    galleries: rows.map((row) => ({
      id: row.id,
      title: row.title,
      coverImageUrl:
        row.cover_image_path && isLikelyStoragePath(row.cover_image_path)
          ? signedByPath.get(row.cover_image_path) ?? null
          : row.cover_image_path,
      startDate: row.start_date,
      endDate: row.end_date,
      isOnPublicProfile: row.is_on_public_profile,
    })),
  });
}

export const dynamic = "force-dynamic";
