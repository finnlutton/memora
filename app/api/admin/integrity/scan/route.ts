import { NextResponse } from "next/server";
import { isAdminEmail } from "@/lib/admin/access";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { createSupabaseServerClient } from "@/lib/supabase/server";

const SAMPLE_LIMIT = 8;

type IntegrityCheckResult = {
  key: string;
  name: string;
  description: string;
  count: number;
  samples: Array<Record<string, string | null>>;
};

function toSample<T extends Record<string, unknown>>(rows: T[]) {
  return rows.slice(0, SAMPLE_LIMIT).map((row) => {
    const sample: Record<string, string | null> = {};
    Object.entries(row).forEach(([key, value]) => {
      sample[key] = value == null ? null : String(value);
    });
    return sample;
  });
}

async function listAllAuthUserIds(admin: ReturnType<typeof createSupabaseAdminClient>) {
  const userIds = new Set<string>();
  const perPage = 1000;
  let page = 1;

  for (;;) {
    const { data, error } = await admin.auth.admin.listUsers({ page, perPage });
    if (error) throw error;
    const users = data.users ?? [];
    users.forEach((user) => userIds.add(user.id));
    if (users.length < perPage) break;
    page += 1;
  }

  return userIds;
}

export async function GET() {
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

    const admin = createSupabaseAdminClient();
    const [
      galleriesRes,
      subgalleriesRes,
      photosRes,
      sharesRes,
      shareGalleriesRes,
      profilesRes,
      authUserIds,
    ] = await Promise.all([
      admin.from("galleries").select("id, title, cover_image_path, user_id").returns<
        Array<{ id: string; title: string | null; cover_image_path: string | null; user_id: string }>
      >(),
      admin.from("subgalleries").select("id, gallery_id, user_id").returns<
        Array<{ id: string; gallery_id: string; user_id: string }>
      >(),
      admin.from("photos").select("id, subgallery_id, gallery_id, user_id, storage_path").returns<
        Array<{
          id: string;
          subgallery_id: string | null;
          gallery_id: string | null;
          user_id: string;
          storage_path: string | null;
        }>
      >(),
      admin.from("shares").select("id").returns<Array<{ id: string }>>(),
      admin.from("share_galleries").select("id, share_id, gallery_id").returns<
        Array<{ id: string; share_id: string; gallery_id: string }>
      >(),
      admin.from("profiles").select("id, email").returns<Array<{ id: string; email: string | null }>>(),
      listAllAuthUserIds(admin),
    ]);

    if (galleriesRes.error) throw galleriesRes.error;
    if (subgalleriesRes.error) throw subgalleriesRes.error;
    if (photosRes.error) throw photosRes.error;
    if (sharesRes.error) throw sharesRes.error;
    if (shareGalleriesRes.error) throw shareGalleriesRes.error;
    if (profilesRes.error) throw profilesRes.error;

    const galleries = galleriesRes.data ?? [];
    const subgalleries = subgalleriesRes.data ?? [];
    const photos = photosRes.data ?? [];
    const shares = sharesRes.data ?? [];
    const shareGalleries = shareGalleriesRes.data ?? [];
    const profiles = profilesRes.data ?? [];

    const galleryIds = new Set(galleries.map((row) => row.id));
    const subgalleryIds = new Set(subgalleries.map((row) => row.id));
    const shareIds = new Set(shares.map((row) => row.id));
    const profileIds = new Set(profiles.map((row) => row.id));

    const subgalleryCountByGallery = new Map<string, number>();
    subgalleries.forEach((row) => {
      subgalleryCountByGallery.set(row.gallery_id, (subgalleryCountByGallery.get(row.gallery_id) ?? 0) + 1);
    });

    const photoCountBySubgallery = new Map<string, number>();
    photos.forEach((row) => {
      if (!row.subgallery_id) return;
      photoCountBySubgallery.set(row.subgallery_id, (photoCountBySubgallery.get(row.subgallery_id) ?? 0) + 1);
    });

    const checks: IntegrityCheckResult[] = [];

    const galleriesWithoutSubgalleries = galleries
      .filter((row) => (subgalleryCountByGallery.get(row.id) ?? 0) === 0)
      .map((row) => ({ gallery_id: row.id, title: row.title }));
    checks.push({
      key: "galleries_without_subgalleries",
      name: "Galleries without subgalleries",
      description: "Gallery records with no child subgalleries/scenes.",
      count: galleriesWithoutSubgalleries.length,
      samples: toSample(galleriesWithoutSubgalleries),
    });

    const galleriesMissingTitle = galleries
      .filter((row) => !row.title || row.title.trim().length === 0)
      .map((row) => ({ gallery_id: row.id, user_id: row.user_id }));
    checks.push({
      key: "galleries_missing_title",
      name: "Galleries missing title",
      description: "Gallery title is null or empty string.",
      count: galleriesMissingTitle.length,
      samples: toSample(galleriesMissingTitle),
    });

    const galleriesMissingCover = galleries
      .filter((row) => !row.cover_image_path || row.cover_image_path.trim().length === 0)
      .map((row) => ({ gallery_id: row.id, title: row.title }));
    checks.push({
      key: "galleries_missing_cover_image",
      name: "Galleries missing cover image",
      description: "No cover image path recorded (useful quality/sanity signal).",
      count: galleriesMissingCover.length,
      samples: toSample(galleriesMissingCover),
    });

    const subgalleriesMissingParent = subgalleries
      .filter((row) => !galleryIds.has(row.gallery_id))
      .map((row) => ({ subgallery_id: row.id, gallery_id: row.gallery_id, user_id: row.user_id }));
    checks.push({
      key: "subgalleries_missing_parent_gallery",
      name: "Subgalleries with missing parent gallery",
      description: "Subgallery.gallery_id points to a gallery that does not exist.",
      count: subgalleriesMissingParent.length,
      samples: toSample(subgalleriesMissingParent),
    });

    const subgalleriesWithoutPhotos = subgalleries
      .filter((row) => (photoCountBySubgallery.get(row.id) ?? 0) === 0)
      .map((row) => ({ subgallery_id: row.id, gallery_id: row.gallery_id }));
    checks.push({
      key: "subgalleries_without_photos",
      name: "Subgalleries without photos",
      description: "Subgallery has no child photo rows.",
      count: subgalleriesWithoutPhotos.length,
      samples: toSample(subgalleriesWithoutPhotos),
    });

    const photosMissingParentSubgallery = photos
      .filter((row) => !row.subgallery_id || !subgalleryIds.has(row.subgallery_id))
      .map((row) => ({ photo_id: row.id, subgallery_id: row.subgallery_id, gallery_id: row.gallery_id }));
    checks.push({
      key: "photos_missing_parent_subgallery",
      name: "Photos with missing parent subgallery",
      description: "Photo.subgallery_id is null or points to a non-existent subgallery.",
      count: photosMissingParentSubgallery.length,
      samples: toSample(photosMissingParentSubgallery),
    });

    const photosMissingStoragePath = photos
      .filter((row) => !row.storage_path || row.storage_path.trim().length === 0)
      .map((row) => ({ photo_id: row.id, subgallery_id: row.subgallery_id, gallery_id: row.gallery_id }));
    checks.push({
      key: "photos_missing_storage_path",
      name: "Photos missing storage path",
      description: "Photo.storage_path is null or empty.",
      count: photosMissingStoragePath.length,
      samples: toSample(photosMissingStoragePath),
    });

    const photosMissingRequiredLinks = photos
      .filter((row) => !row.gallery_id || !row.user_id)
      .map((row) => ({
        photo_id: row.id,
        gallery_id: row.gallery_id,
        user_id: row.user_id,
      }));
    checks.push({
      key: "photos_missing_required_relationship_fields",
      name: "Photos missing required relationship fields",
      description: "Photo is missing expected user_id and/or gallery_id values.",
      count: photosMissingRequiredLinks.length,
      samples: toSample(photosMissingRequiredLinks),
    });

    const shareMappingsMissingShare = shareGalleries
      .filter((row) => !shareIds.has(row.share_id))
      .map((row) => ({ share_gallery_id: row.id, share_id: row.share_id, gallery_id: row.gallery_id }));
    checks.push({
      key: "share_galleries_missing_share",
      name: "Share mappings with missing share",
      description: "share_galleries.share_id points to a share that does not exist.",
      count: shareMappingsMissingShare.length,
      samples: toSample(shareMappingsMissingShare),
    });

    const shareMappingsMissingGallery = shareGalleries
      .filter((row) => !galleryIds.has(row.gallery_id))
      .map((row) => ({ share_gallery_id: row.id, share_id: row.share_id, gallery_id: row.gallery_id }));
    checks.push({
      key: "share_galleries_missing_gallery",
      name: "Share mappings with missing gallery",
      description: "share_galleries.gallery_id points to a gallery that does not exist.",
      count: shareMappingsMissingGallery.length,
      samples: toSample(shareMappingsMissingGallery),
    });

    const usersWithoutProfile = Array.from(authUserIds)
      .filter((userId) => !profileIds.has(userId))
      .map((userId) => ({ user_id: userId }));
    checks.push({
      key: "users_without_profile",
      name: "Auth users without profile",
      description: "Auth users that do not have a corresponding profiles row.",
      count: usersWithoutProfile.length,
      samples: toSample(usersWithoutProfile),
    });

    const profilesWithoutUser = profiles
      .filter((profile) => !authUserIds.has(profile.id))
      .map((profile) => ({ profile_id: profile.id, email: profile.email }));
    checks.push({
      key: "profiles_without_auth_user",
      name: "Profiles without auth user",
      description: "profiles rows that are not tied to an existing auth user.",
      count: profilesWithoutUser.length,
      samples: toSample(profilesWithoutUser),
    });

    const totalIssueCount = checks.reduce((sum, check) => sum + check.count, 0);
    const checksWithIssues = checks.filter((check) => check.count > 0).length;

    return NextResponse.json(
      {
        generatedAt: new Date().toISOString(),
        summary: {
          totalChecks: checks.length,
          checksWithIssues,
          totalIssueCount,
          healthy: totalIssueCount === 0,
        },
        checks,
      },
      { status: 200 },
    );
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Unable to run integrity scan." },
      { status: 500 },
    );
  }
}
