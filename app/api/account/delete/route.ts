import { NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";

const STORAGE_BUCKET = "gallery-images";

type StorageListItem = {
  name: string;
  id?: string | null;
  metadata?: unknown | null;
};

async function listAllStorageObjectsUnderPrefix(
  prefix: string,
  admin = createSupabaseAdminClient(),
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

      if (error) {
        throw error;
      }

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

export async function DELETE() {
  try {
    const supabase = await createSupabaseServerClient();
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: "Not authenticated." }, { status: 401 });
    }

    const admin = createSupabaseAdminClient();
    const storagePaths = await listAllStorageObjectsUnderPrefix(user.id, admin);

    console.info("Memora: account deletion started", { userId: user.id, storageFileCount: storagePaths.length });

    if (storagePaths.length) {
      const { error: storageError } = await admin.storage.from(STORAGE_BUCKET).remove(storagePaths);
      if (storageError) {
        console.error("Memora: account deletion storage cleanup failed", storageError);
        return NextResponse.json(
          { error: "Unable to delete uploaded files right now." },
          { status: 500 },
        );
      }
    }

    const { error: deleteUserError } = await admin.auth.admin.deleteUser(user.id);
    if (deleteUserError) {
      console.error("Memora: account deletion auth delete failed", deleteUserError);
      return NextResponse.json(
        { error: "Unable to delete your account right now." },
        { status: 500 },
      );
    }

    console.info("Memora: account deletion completed", { userId: user.id });
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Memora: account deletion failed", error);
    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Account deletion could not be completed.",
      },
      { status: 500 },
    );
  }
}
