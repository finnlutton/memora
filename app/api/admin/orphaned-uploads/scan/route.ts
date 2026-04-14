import { NextResponse } from "next/server";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { isAdminEmail } from "@/lib/admin/access";
import { createSupabaseServerClient } from "@/lib/supabase/server";

const STORAGE_BUCKET = "gallery-images";

type StorageListItem = {
  name: string;
  id?: string | null;
  metadata?: unknown | null;
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

async function listAllStorageObjects(
  admin: ReturnType<typeof createSupabaseAdminClient>,
  prefix = "",
) {
  const files: string[] = [];
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
          files.push(nextPath);
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

    const [galleryRowsResult, subgalleryRowsResult, photoRowsResult] = await Promise.all([
      admin.from("galleries").select("cover_image_path"),
      admin.from("subgalleries").select("cover_image_path"),
      admin.from("photos").select("storage_path"),
    ]);

    if (galleryRowsResult.error) throw galleryRowsResult.error;
    if (subgalleryRowsResult.error) throw subgalleryRowsResult.error;
    if (photoRowsResult.error) throw photoRowsResult.error;

    const galleryRows = (galleryRowsResult.data ?? []) as Array<{ cover_image_path: string | null }>;
    const subgalleryRows = (subgalleryRowsResult.data ?? []) as Array<{ cover_image_path: string | null }>;
    const photoRows = (photoRowsResult.data ?? []) as Array<{ storage_path: string }>;

    const referenced = new Set<string>();
    for (const row of galleryRows) {
      const path = row.cover_image_path ? normalizeToStoragePath(row.cover_image_path) : null;
      if (path && isLikelyStoragePath(path)) referenced.add(path);
    }
    for (const row of subgalleryRows) {
      const path = row.cover_image_path ? normalizeToStoragePath(row.cover_image_path) : null;
      if (path && isLikelyStoragePath(path)) referenced.add(path);
    }
    for (const row of photoRows) {
      const path = normalizeToStoragePath(row.storage_path);
      if (path && isLikelyStoragePath(path)) referenced.add(path);
    }

    const allObjects = await listAllStorageObjects(admin, "");
    const orphanedObjects = allObjects
      .map((path) => normalizeToStoragePath(path))
      .filter((path) => isLikelyStoragePath(path) && !referenced.has(path))
      .sort();

    return NextResponse.json(
      {
        totalObjects: allObjects.length,
        referencedObjects: referenced.size,
        orphanedObjects,
      },
      { status: 200 },
    );
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Unable to scan uploads." },
      { status: 500 },
    );
  }
}
