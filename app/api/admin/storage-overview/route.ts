import { NextResponse } from "next/server";
import { isAdminEmail } from "@/lib/admin/access";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { createSupabaseServerClient } from "@/lib/supabase/server";

const STORAGE_BUCKET = "gallery-images";
const TOP_USER_LIMIT = 10;

type StorageListItem = {
  name: string;
  id?: string | null;
  metadata?: { size?: number } | null;
};

function normalizeToStoragePath(value: string) {
  if (!value) return value;
  if (!value.startsWith("http")) return value;
  try {
    const parsed = new URL(value);
    const match = parsed.pathname.match(/\/storage\/v1\/object\/(?:sign|public)\/([^/]+)\/(.+)$/);
    if (!match) return value;
    const bucket = match[1];
    const path = match[2];
    if (bucket !== STORAGE_BUCKET) return value;
    return decodeURIComponent(path);
  } catch {
    return value;
  }
}

function isLikelyStoragePath(path: string) {
  return !path.startsWith("data:") && !path.startsWith("blob:") && !path.startsWith("/") && !path.startsWith("http");
}

async function listAllStorageObjectsWithSize(admin: ReturnType<typeof createSupabaseAdminClient>, prefix = "") {
  const files: Array<{ path: string; size: number | null }> = [];
  const queue: string[] = [prefix];

  while (queue.length) {
    const folder = queue.shift()!;
    let offset = 0;

    for (;;) {
      const { data, error } = await admin.storage.from(STORAGE_BUCKET).list(folder, {
        limit: 1000,
        offset,
        sortBy: { column: "name", order: "asc" },
      });
      if (error) throw error;
      const items = (data ?? []) as StorageListItem[];
      if (items.length === 0) break;

      for (const item of items) {
        const isFolder = item.id == null && item.metadata == null;
        const nextPath = folder ? `${folder}/${item.name}` : item.name;
        if (isFolder) {
          queue.push(nextPath);
        } else {
          const rawSize = item.metadata?.size;
          files.push({
            path: nextPath,
            size: typeof rawSize === "number" && Number.isFinite(rawSize) ? rawSize : null,
          });
        }
      }

      if (items.length < 1000) break;
      offset += items.length;
    }
  }

  return files;
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

    const [objects, galleryCountRes, subgalleryCountRes, photoCountRes, photosRes, galleriesRes, subgalleriesRes] =
      await Promise.all([
        listAllStorageObjectsWithSize(admin, ""),
        admin.from("galleries").select("id", { count: "exact", head: true }),
        admin.from("subgalleries").select("id", { count: "exact", head: true }),
        admin.from("photos").select("id", { count: "exact", head: true }),
        admin.from("photos").select("user_id, storage_path").returns<Array<{ user_id: string; storage_path: string }>>(),
        admin.from("galleries").select("user_id, cover_image_path").returns<
          Array<{ user_id: string; cover_image_path: string | null }>
        >(),
        admin.from("subgalleries").select("user_id, cover_image_path").returns<
          Array<{ user_id: string; cover_image_path: string | null }>
        >(),
      ]);

    if (galleryCountRes.error) throw galleryCountRes.error;
    if (subgalleryCountRes.error) throw subgalleryCountRes.error;
    if (photoCountRes.error) throw photoCountRes.error;
    if (photosRes.error) throw photosRes.error;
    if (galleriesRes.error) throw galleriesRes.error;
    if (subgalleriesRes.error) throw subgalleriesRes.error;

    const photos = photosRes.data ?? [];
    const galleries = galleriesRes.data ?? [];
    const subgalleries = subgalleriesRes.data ?? [];

    const referencedPhotoPaths = new Set<string>();
    photos.forEach((row) => {
      const path = normalizeToStoragePath(row.storage_path);
      if (path && isLikelyStoragePath(path)) referencedPhotoPaths.add(path);
    });

    const referencedArchivePaths = new Set<string>(referencedPhotoPaths);
    galleries.forEach((row) => {
      const path = row.cover_image_path ? normalizeToStoragePath(row.cover_image_path) : null;
      if (path && isLikelyStoragePath(path)) referencedArchivePaths.add(path);
    });
    subgalleries.forEach((row) => {
      const path = row.cover_image_path ? normalizeToStoragePath(row.cover_image_path) : null;
      if (path && isLikelyStoragePath(path)) referencedArchivePaths.add(path);
    });

    const normalizedObjects = objects
      .map((entry) => ({ ...entry, path: normalizeToStoragePath(entry.path) }))
      .filter((entry) => isLikelyStoragePath(entry.path));

    const totalObjects = normalizedObjects.length;
    const orphanedObjects = normalizedObjects.filter((entry) => !referencedArchivePaths.has(entry.path));

    const sizeKnownObjectCount = normalizedObjects.filter((entry) => entry.size != null).length;
    const hasSizeMetrics = sizeKnownObjectCount > 0;
    const totalStorageBytes = hasSizeMetrics
      ? normalizedObjects.reduce((sum, entry) => sum + (entry.size ?? 0), 0)
      : null;
    const referencedStorageBytes = hasSizeMetrics
      ? normalizedObjects.reduce(
          (sum, entry) => sum + (referencedArchivePaths.has(entry.path) ? (entry.size ?? 0) : 0),
          0,
        )
      : null;
    const orphanedStorageBytes = hasSizeMetrics
      ? orphanedObjects.reduce((sum, entry) => sum + (entry.size ?? 0), 0)
      : null;

    const photoCountByUser = new Map<string, number>();
    photos.forEach((row) => {
      photoCountByUser.set(row.user_id, (photoCountByUser.get(row.user_id) ?? 0) + 1);
    });
    const galleryCountByUser = new Map<string, number>();
    galleries.forEach((row) => {
      galleryCountByUser.set(row.user_id, (galleryCountByUser.get(row.user_id) ?? 0) + 1);
    });

    const usageUserIds = Array.from(new Set([...photoCountByUser.keys(), ...galleryCountByUser.keys()]));
    const emailMap = new Map<string, string>();
    if (usageUserIds.length) {
      const { data: profiles, error: profilesError } = await admin
        .from("profiles")
        .select("id, email")
        .in("id", usageUserIds)
        .returns<Array<{ id: string; email: string | null }>>();
      if (profilesError) throw profilesError;
      (profiles ?? []).forEach((profile) => {
        emailMap.set(profile.id, profile.email ?? "Unknown");
      });
    }

    const topUsers = usageUserIds
      .map((userId) => ({
        userId,
        email: emailMap.get(userId) ?? "Unknown",
        photoCount: photoCountByUser.get(userId) ?? 0,
        galleryCount: galleryCountByUser.get(userId) ?? 0,
      }))
      .sort((left, right) => {
        if (right.photoCount !== left.photoCount) return right.photoCount - left.photoCount;
        return right.galleryCount - left.galleryCount;
      })
      .slice(0, TOP_USER_LIMIT);

    return NextResponse.json(
      {
        generatedAt: new Date().toISOString(),
        metrics: {
          totalObjects,
          referencedPhotoObjects: referencedPhotoPaths.size,
          referencedArchiveObjects: referencedArchivePaths.size,
          orphanedObjects: orphanedObjects.length,
          totalGalleries: galleryCountRes.count ?? 0,
          totalSubgalleries: subgalleryCountRes.count ?? 0,
          totalPhotos: photoCountRes.count ?? 0,
          hasSizeMetrics,
          totalStorageBytes,
          referencedStorageBytes,
          orphanedStorageBytes,
        },
        topUsers,
      },
      { status: 200 },
    );
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Unable to load storage overview." },
      { status: 500 },
    );
  }
}
