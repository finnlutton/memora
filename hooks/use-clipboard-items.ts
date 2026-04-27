"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { compressImageFile } from "@/lib/file";
import { createSupabaseBrowserClient } from "@/lib/supabase/browser";
import { useMemoraStore } from "@/hooks/use-memora-store";

/**
 * Clipboard CRUD hook.
 *
 * Handles loading, creating, updating (content + position), and
 * deleting clipboard items, plus uploading the optional photo to the
 * shared `gallery-images` bucket under `{userId}/clipboard/...`. Photo
 * paths are translated to short-lived signed URLs for display.
 *
 * Kept self-contained: doesn't touch the main MemoraStore so the
 * existing galleries flow stays untouched. Reads `onboarding.user.id`
 * from the store only to decide when to load.
 */

const BUCKET = "gallery-images";
const SIGNED_URL_TTL_SECONDS = 60 * 60; // 1 hour

export type ClipboardLayout = "text" | "photo" | "text_photo";

export type ClipboardItem = {
  id: string;
  content: string | null;
  /** Original storage path, e.g. "{userId}/clipboard/{id}-{ts}.jpg". */
  photoPath: string | null;
  /** Short-lived signed URL for display. Refreshed on each load. */
  photoUrl: string | null;
  xPosition: number | null;
  yPosition: number | null;
  layoutType: ClipboardLayout;
  createdAt: string;
  updatedAt: string;
};

type ClipboardItemRow = {
  id: string;
  user_id: string;
  content: string | null;
  photo_path: string | null;
  x_position: number | null;
  y_position: number | null;
  layout_type: ClipboardLayout;
  created_at: string;
  updated_at: string;
};

async function resolveSignedUrls(
  supabase: ReturnType<typeof createSupabaseBrowserClient>,
  paths: string[],
) {
  const map = new Map<string, string>();
  if (paths.length === 0) return map;
  const unique = Array.from(new Set(paths));
  const { data, error } = await supabase.storage
    .from(BUCKET)
    .createSignedUrls(unique, SIGNED_URL_TTL_SECONDS);
  if (error) {
    console.error("Memora clipboard: signed URL batch failed", error);
    return map;
  }
  data?.forEach((entry: { path: string | null; signedUrl: string | null }) => {
    if (entry.path && entry.signedUrl) {
      map.set(entry.path, entry.signedUrl);
    }
  });
  return map;
}

function rowToItem(
  row: ClipboardItemRow,
  signedUrls: Map<string, string>,
): ClipboardItem {
  return {
    id: row.id,
    content: row.content,
    photoPath: row.photo_path,
    photoUrl: row.photo_path ? signedUrls.get(row.photo_path) ?? null : null,
    xPosition: row.x_position,
    yPosition: row.y_position,
    layoutType: row.layout_type,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

async function fileToBlobAndExt(file: File) {
  const ext = file.type.includes("png")
    ? "png"
    : file.type.includes("webp")
      ? "webp"
      : "jpg";
  return { blob: file, ext };
}

export function useClipboardItems() {
  const { onboarding } = useMemoraStore();
  const userId = onboarding.user?.id ?? null;
  const [items, setItems] = useState<ClipboardItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  // Stable ref so callbacks don't need to be recreated when items change.
  const itemsRef = useRef<ClipboardItem[]>([]);
  itemsRef.current = items;

  const supabase = useMemo(() => createSupabaseBrowserClient(), []);

  // Initial + on-user-change load.
  useEffect(() => {
    let cancelled = false;
    if (!userId) {
      setItems([]);
      setLoading(false);
      return;
    }
    setLoading(true);
    setError(null);
    void (async () => {
      try {
        const { data, error: queryError } = await supabase
          .from("clipboard_items")
          .select("*")
          .eq("user_id", userId)
          .order("created_at", { ascending: false });
        if (queryError) throw queryError;
        const rows = (data ?? []) as ClipboardItemRow[];
        const photoPaths = rows
          .map((row) => row.photo_path)
          .filter((p): p is string => Boolean(p));
        const signedUrls = await resolveSignedUrls(supabase, photoPaths);
        if (cancelled) return;
        setItems(rows.map((row) => rowToItem(row, signedUrls)));
      } catch (err) {
        if (cancelled) return;
        console.error("Memora clipboard: load failed", err);
        setError(
          err instanceof Error ? err.message : "Could not load clipboard.",
        );
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [userId, supabase]);

  const addItem = useCallback(
    async (input: {
      layoutType: ClipboardLayout;
      content?: string | null;
      file?: File | null;
      xPosition?: number | null;
      yPosition?: number | null;
    }) => {
      if (!userId) throw new Error("Please sign in to add memories.");
      const id =
        typeof crypto !== "undefined" ? crypto.randomUUID() : `clip-${Date.now()}`;

      // Upload photo first if present. We always run the file through
      // a client-side resize + JPEG re-encode (max 1920 px long edge,
      // q=82) so we don't ship a raw 12 MP camera JPEG to storage —
      // typical reduction is 5–15× while preserving visual quality at
      // the sizes the clipboard actually displays.
      let photoPath: string | null = null;
      if (input.file) {
        const compressed = await compressImageFile(input.file);
        const { blob, ext } = await fileToBlobAndExt(compressed);
        const candidatePath = `${userId}/clipboard/${id}-${Date.now()}.${ext}`;
        const { error: uploadError } = await supabase.storage
          .from(BUCKET)
          .upload(candidatePath, blob, {
            contentType: blob.type || "image/jpeg",
            upsert: true,
          });
        if (uploadError) {
          console.error("Memora clipboard: photo upload failed", uploadError);
          throw new Error(
            "Photo upload failed. Try a smaller image or a different file.",
          );
        }
        photoPath = candidatePath;
      }

      const insertPayload = {
        id,
        user_id: userId,
        content: input.content?.trim() || null,
        photo_path: photoPath,
        x_position: input.xPosition ?? null,
        y_position: input.yPosition ?? null,
        layout_type: input.layoutType,
      };

      const { data, error: insertError } = await supabase
        .from("clipboard_items")
        .insert(insertPayload)
        .select("*")
        .single();
      if (insertError) {
        // If the insert fails after a successful upload, try to clean up
        // the orphan storage object so we don't leak.
        if (photoPath) {
          await supabase.storage.from(BUCKET).remove([photoPath]).catch(() => {});
        }
        throw insertError;
      }

      const row = data as ClipboardItemRow;
      const signedUrls = photoPath
        ? await resolveSignedUrls(supabase, [photoPath])
        : new Map<string, string>();
      const created = rowToItem(row, signedUrls);
      setItems((prev) => [created, ...prev]);
      return created;
    },
    [supabase, userId],
  );

  const updateContent = useCallback(
    async (id: string, content: string) => {
      if (!userId) return;
      const next = content.trim() || null;
      const { error: updateError } = await supabase
        .from("clipboard_items")
        .update({ content: next })
        .eq("id", id)
        .eq("user_id", userId);
      if (updateError) throw updateError;
      setItems((prev) =>
        prev.map((item) => (item.id === id ? { ...item, content: next } : item)),
      );
    },
    [supabase, userId],
  );

  const updatePosition = useCallback(
    async (id: string, x: number, y: number) => {
      // Optimistic local update — position dragging fires often, we don't
      // want a network roundtrip per pixel.
      setItems((prev) =>
        prev.map((item) =>
          item.id === id ? { ...item, xPosition: x, yPosition: y } : item,
        ),
      );
      if (!userId) return;
      const { error: updateError } = await supabase
        .from("clipboard_items")
        .update({ x_position: x, y_position: y })
        .eq("id", id)
        .eq("user_id", userId);
      if (updateError) {
        console.error("Memora clipboard: position write failed", updateError);
      }
    },
    [supabase, userId],
  );

  const removeItem = useCallback(
    async (id: string) => {
      if (!userId) return;
      const target = itemsRef.current.find((item) => item.id === id);
      // Optimistic remove.
      setItems((prev) => prev.filter((item) => item.id !== id));
      try {
        const { error: deleteError } = await supabase
          .from("clipboard_items")
          .delete()
          .eq("id", id)
          .eq("user_id", userId);
        if (deleteError) throw deleteError;
        if (target?.photoPath) {
          await supabase.storage
            .from(BUCKET)
            .remove([target.photoPath])
            .catch((err: unknown) => {
              console.warn("Memora clipboard: photo cleanup failed", err);
            });
        }
      } catch (err) {
        console.error("Memora clipboard: delete failed", err);
        // Revert on failure.
        if (target) setItems((prev) => [target, ...prev]);
        throw err;
      }
    },
    [supabase, userId],
  );

  return {
    items,
    loading,
    error,
    addItem,
    updateContent,
    updatePosition,
    removeItem,
  };
}
