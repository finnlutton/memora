"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import {
  CalendarPlus,
  ChevronLeft,
  ChevronRight,
  ImagePlus,
  MapPin,
  Pencil,
  Trash2,
  X,
} from "lucide-react";
import { UploadDropzone } from "@/components/upload-dropzone";
import { useMemoraStore } from "@/hooks/use-memora-store";
import { filesToPhotos } from "@/lib/file";
import type { Gallery, GalleryDivider, MemoryPhoto } from "@/types/memora";

/**
 * Gallery direct-photo workspace.
 *
 * One ordered list of items — photos render as small grid tiles, dividers
 * render as left-aligned subtitles that span the full grid row. Photos and
 * dividers share a single ordering namespace per gallery (see
 * `reorderGalleryItems`). Native HTML5 drag-and-drop reorders any item
 * to any position; on drop we recompute the full order and persist.
 */

type Item =
  | { kind: "photo"; data: MemoryPhoto }
  | { kind: "divider"; data: GalleryDivider };

export function GalleryDirectPhotos({ gallery }: { gallery: Gallery }) {
  const {
    addGalleryPhotos,
    updateGalleryPhoto,
    removeGalleryPhoto,
    addDivider,
    updateDivider,
    removeDivider,
    reorderGalleryItems,
  } = useMemoraStore();

  const items = useMemo<Item[]>(() => {
    const merged: Array<Item & { order: number }> = [
      ...gallery.directPhotos.map((p) => ({
        kind: "photo" as const,
        data: p,
        order: p.order,
      })),
      ...gallery.dividers.map((d) => ({
        kind: "divider" as const,
        data: d,
        order: d.order,
      })),
    ];
    merged.sort((a, b) => a.order - b.order);
    return merged.map(({ kind, data }) =>
      kind === "photo"
        ? ({ kind: "photo", data: data as MemoryPhoto } satisfies Item)
        : ({ kind: "divider", data: data as GalleryDivider } satisfies Item),
    );
  }, [gallery.directPhotos, gallery.dividers]);

  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [focusDividerId, setFocusDividerId] = useState<string | null>(null);
  const [editingPhotoId, setEditingPhotoId] = useState<string | null>(null);

  // Drag-and-drop reorder state
  const [draggingId, setDraggingId] = useState<string | null>(null);
  const [hoverId, setHoverId] = useState<string | null>(null);

  // Live column count, mirroring the grid breakpoints below
  // (grid-cols-3 / sm:grid-cols-4 / lg:grid-cols-5). Used so divider
  // chevrons step one *visual row* at a time instead of one item.
  const [cols, setCols] = useState(3);
  useEffect(() => {
    if (typeof window === "undefined") return;
    const compute = () => {
      if (window.matchMedia("(min-width: 1024px)").matches) return 5;
      if (window.matchMedia("(min-width: 640px)").matches) return 4;
      return 3;
    };
    setCols(compute());
    const onResize = () => setCols(compute());
    window.addEventListener("resize", onResize);
    return () => window.removeEventListener("resize", onResize);
  }, []);

  const onFiles = async (files: File[]) => {
    setBusy(true);
    setError(null);
    try {
      const photos = await filesToPhotos(files, null);
      await addGalleryPhotos(gallery.id, photos);
    } catch (err) {
      console.error("Memora: addGalleryPhotos failed", err);
      setError(err instanceof Error ? err.message : "Failed to upload photos.");
    } finally {
      setBusy(false);
    }
  };

  const onAddDivider = async () => {
    setError(null);
    try {
      const id = await addDivider(gallery.id, "");
      setFocusDividerId(id);
    } catch (err) {
      console.error("Memora: addDivider failed", err);
      setError(err instanceof Error ? err.message : "Failed to add divider.");
    }
  };

  // Reorder helpers
  const onDragStartItem = (id: string) => () => setDraggingId(id);
  const onDragOverItem = (id: string) => (e: React.DragEvent) => {
    if (!draggingId) return;
    e.preventDefault();
    if (id !== hoverId) setHoverId(id);
  };
  const onDropOnItem = (targetId: string) => async () => {
    const sourceId = draggingId;
    setDraggingId(null);
    setHoverId(null);
    if (!sourceId || sourceId === targetId) return;
    const sourceIdx = items.findIndex((it) => it.data.id === sourceId);
    const targetIdx = items.findIndex((it) => it.data.id === targetId);
    if (sourceIdx < 0 || targetIdx < 0) return;
    const next = items.slice();
    const [moved] = next.splice(sourceIdx, 1);
    next.splice(targetIdx, 0, moved);
    try {
      await reorderGalleryItems(
        gallery.id,
        next.map((it) => ({ type: it.kind, id: it.data.id })),
      );
    } catch (err) {
      console.error("Memora: reorderGalleryItems failed", err);
      setError(err instanceof Error ? err.message : "Failed to reorder.");
    }
  };

  // Step reorder via prev/next arrows — touch-friendly alternative to
  // drag-and-drop.
  //
  // Photos step one slot at a time. Dividers step one *visual row* of
  // photos at a time — so each click jumps the divider past up to
  // `cols` photos in its current section. The divider stops at the
  // next divider (it doesn't cross other dividers) and naturally lands
  // exactly on the row line you'd expect.
  const moveItem = async (id: string, direction: -1 | 1) => {
    const idx = items.findIndex((it) => it.data.id === id);
    if (idx < 0) return;

    let next: Item[];
    if (items[idx].kind === "divider") {
      if (direction === 1) {
        // Walk forward through up to `cols` consecutive photos.
        let target = idx + 1;
        let crossed = 0;
        while (
          target < items.length &&
          items[target].kind === "photo" &&
          crossed < cols
        ) {
          target++;
          crossed++;
        }
        if (crossed === 0) return;
        next = [
          ...items.slice(0, idx),
          ...items.slice(idx + 1, target),
          items[idx],
          ...items.slice(target),
        ];
      } else {
        let target = idx - 1;
        let crossed = 0;
        while (
          target >= 0 &&
          items[target].kind === "photo" &&
          crossed < cols
        ) {
          target--;
          crossed++;
        }
        if (crossed === 0) return;
        next = [
          ...items.slice(0, target + 1),
          items[idx],
          ...items.slice(target + 1, idx),
          ...items.slice(idx + 1),
        ];
      }
    } else {
      const targetIdx = idx + direction;
      if (targetIdx < 0 || targetIdx >= items.length) return;
      next = items.slice();
      [next[idx], next[targetIdx]] = [next[targetIdx], next[idx]];
    }

    try {
      await reorderGalleryItems(
        gallery.id,
        next.map((it) => ({ type: it.kind, id: it.data.id })),
      );
    } catch (err) {
      console.error("Memora: reorderGalleryItems failed", err);
      setError(err instanceof Error ? err.message : "Failed to reorder.");
    }
  };

  // Upload photos and insert them immediately after a given divider
  // instead of appending to the end. Uploads first (which appends),
  // then reorders so the new IDs sit right after the divider.
  const onFilesAfterDivider = async (dividerId: string, files: File[]) => {
    setBusy(true);
    setError(null);
    try {
      const photos = await filesToPhotos(files, null);
      const newIds = await addGalleryPhotos(gallery.id, photos);
      if (newIds.length === 0) return;
      const dividerIdx = items.findIndex((it) => it.data.id === dividerId);
      if (dividerIdx < 0) return;
      const existingOrder = items
        .filter((it) => !newIds.includes(it.data.id))
        .map((it) => ({ type: it.kind, id: it.data.id }));
      const insertAt = existingOrder.findIndex((it) => it.id === dividerId) + 1;
      const reordered = [
        ...existingOrder.slice(0, insertAt),
        ...newIds.map((id) => ({ type: "photo" as const, id })),
        ...existingOrder.slice(insertAt),
      ];
      await reorderGalleryItems(gallery.id, reordered);
    } catch (err) {
      console.error("Memora: insert-after-divider upload failed", err);
      setError(err instanceof Error ? err.message : "Failed to upload photos.");
    } finally {
      setBusy(false);
    }
  };

  const isEmpty = items.length === 0;

  return (
    <section className="mt-auto pt-12">
      {!isEmpty ? (
        <div className="mb-8 grid grid-cols-3 gap-2 sm:grid-cols-4 sm:gap-3 lg:grid-cols-5">
          {items.map((item, idx) => {
            const isDragging = draggingId === item.data.id;
            const isHover = hoverId === item.data.id;
            // Dividers can only step over photos (one row at a time), so
            // their chevrons disable when the immediate neighbour is
            // another divider or a list edge. Photos step one slot.
            const canMovePrev =
              item.kind === "divider"
                ? idx > 0 && items[idx - 1].kind === "photo"
                : idx > 0;
            const canMoveNext =
              item.kind === "divider"
                ? idx < items.length - 1 && items[idx + 1].kind === "photo"
                : idx < items.length - 1;
            const dndProps = {
              draggable: true,
              onDragStart: onDragStartItem(item.data.id),
              onDragOver: onDragOverItem(item.data.id),
              onDrop: () => void onDropOnItem(item.data.id)(),
              onDragEnd: () => {
                setDraggingId(null);
                setHoverId(null);
              },
            };
            if (item.kind === "divider") {
              return (
                <div
                  key={item.data.id}
                  {...dndProps}
                  className={`col-span-full transition ${
                    isDragging ? "opacity-50" : ""
                  } ${isHover ? "translate-y-[1px]" : ""}`}
                >
                  <DividerRow
                    divider={item.data}
                    autoFocus={focusDividerId === item.data.id}
                    canMovePrev={canMovePrev}
                    canMoveNext={canMoveNext}
                    onAutoFocusHandled={() => setFocusDividerId(null)}
                    onMovePrev={() => moveItem(item.data.id, -1)}
                    onMoveNext={() => moveItem(item.data.id, 1)}
                    onAddFiles={(files) =>
                      onFilesAfterDivider(item.data.id, files)
                    }
                    onUpdate={(label) =>
                      updateDivider(gallery.id, item.data.id, label)
                    }
                    onRemove={() => removeDivider(gallery.id, item.data.id)}
                  />
                </div>
              );
            }
            return (
              <div
                key={item.data.id}
                {...dndProps}
                className={`transition ${isDragging ? "opacity-50" : ""} ${
                  isHover ? "ring-2 ring-[color:var(--ink-soft)]/30" : ""
                }`}
              >
                <PhotoCard
                  photo={item.data}
                  editing={editingPhotoId === item.data.id}
                  canMovePrev={canMovePrev}
                  canMoveNext={canMoveNext}
                  onMovePrev={() => moveItem(item.data.id, -1)}
                  onMoveNext={() => moveItem(item.data.id, 1)}
                  onStartEdit={() => setEditingPhotoId(item.data.id)}
                  onCloseEdit={() => setEditingPhotoId(null)}
                  onUpdate={(fields) =>
                    updateGalleryPhoto(gallery.id, item.data.id, fields)
                  }
                  onRemove={() => removeGalleryPhoto(gallery.id, item.data.id)}
                />
              </div>
            );
          })}
        </div>
      ) : null}

      <p className="text-[12px] leading-6 text-[color:var(--ink-soft)]">
        Skip subgalleries — upload directly to the gallery.
      </p>

      <div className="mt-3 flex flex-col gap-2 sm:flex-row sm:items-stretch">
        <div className="flex-1">
          <UploadDropzone
            label="Add photos"
            hint="Drag images here or click to upload."
            multiple
            busy={busy}
            onError={(message) => setError(message || null)}
            onFilesSelected={onFiles}
          />
        </div>
        <button
          type="button"
          onClick={onAddDivider}
          className="inline-flex items-center justify-center gap-2 self-stretch px-4 py-3 text-[12px] font-medium uppercase tracking-[0.18em] text-[color:var(--ink-soft)] transition hover:text-[color:var(--ink)] sm:self-auto sm:px-3"
          aria-label="Add divider"
        >
          <CalendarPlus className="h-4 w-4" strokeWidth={1.6} />
          Dividers
        </button>
      </div>

      {error ? (
        <p className="mt-3 text-[13px] text-[color:var(--accent-strong)]">
          {error}
        </p>
      ) : null}
    </section>
  );
}

/* ── Minimal date divider — left-aligned subtitle ─────────────────────── */

/**
 * A small left-aligned subtitle with a short underline beneath. Quiet,
 * editorial — punctuates a series of photos without shouting. Hover the
 * row to reveal trash + a drag grip.
 */
function DividerRow({
  divider,
  autoFocus,
  canMovePrev,
  canMoveNext,
  onAutoFocusHandled,
  onMovePrev,
  onMoveNext,
  onAddFiles,
  onUpdate,
  onRemove,
}: {
  divider: GalleryDivider;
  autoFocus?: boolean;
  canMovePrev: boolean;
  canMoveNext: boolean;
  onAutoFocusHandled?: () => void;
  onMovePrev: () => Promise<void> | void;
  onMoveNext: () => Promise<void> | void;
  onAddFiles: (files: File[]) => Promise<void> | void;
  onUpdate: (label: string) => Promise<void>;
  onRemove: () => Promise<void>;
}) {
  const [value, setValue] = useState(divider.label);
  const inputRef = useRef<HTMLInputElement | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  useEffect(() => {
    if (autoFocus && inputRef.current) {
      inputRef.current.focus();
      inputRef.current.select();
      onAutoFocusHandled?.();
    }
  }, [autoFocus, onAutoFocusHandled]);

  return (
    <div className="group flex items-center gap-2 pt-3">
      <div className="flex flex-col">
        <input
          ref={inputRef}
          value={value}
          onChange={(e) => setValue(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              e.preventDefault();
              (e.currentTarget as HTMLInputElement).blur();
            }
          }}
          onBlur={() => {
            const next = value.trim();
            if (next !== divider.label) void onUpdate(next);
          }}
          placeholder="add label"
          size={Math.max(value.length, 8)}
          className="bg-transparent text-left font-serif text-[17px] leading-tight text-[color:var(--ink)] outline-none placeholder:text-[color:var(--ink-faint)] md:text-[19px]"
        />
        <span
          aria-hidden
          className="mt-1 h-px w-12 bg-[color:var(--border-strong)]"
        />
      </div>
      {/* Hover/touch tools — reorder chevrons, insert-photos here, trash.
          Always visible on touch, hover-revealed on pointer devices to
          keep the divider row visually quiet by default. */}
      <div className="ml-1 inline-flex items-center gap-2 transition [@media(hover:hover)]:opacity-0 [@media(hover:hover)]:group-hover:opacity-100">
        <div className="inline-flex items-center">
          <button
            type="button"
            onClick={() => void onMovePrev()}
            disabled={!canMovePrev}
            aria-label="Move divider earlier"
            className="inline-flex h-5 w-5 items-center justify-center text-[color:var(--ink-faint)] transition hover:text-[color:var(--ink)] disabled:cursor-not-allowed disabled:opacity-30"
          >
            <ChevronLeft className="h-3 w-3" strokeWidth={1.8} />
          </button>
          <button
            type="button"
            onClick={() => void onMoveNext()}
            disabled={!canMoveNext}
            aria-label="Move divider later"
            className="inline-flex h-5 w-5 items-center justify-center text-[color:var(--ink-faint)] transition hover:text-[color:var(--ink)] disabled:cursor-not-allowed disabled:opacity-30"
          >
            <ChevronRight className="h-3 w-3" strokeWidth={1.8} />
          </button>
        </div>
        <button
          type="button"
          onClick={() => fileInputRef.current?.click()}
          aria-label="Add photos under this divider"
          className="inline-flex h-5 w-5 items-center justify-center rounded-sm text-[color:var(--ink-faint)] transition hover:text-[color:var(--ink)]"
        >
          <ImagePlus className="h-3 w-3" strokeWidth={1.8} />
        </button>
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          multiple
          className="hidden"
          onChange={(e) => {
            const files = Array.from(e.target.files ?? []);
            e.target.value = "";
            if (files.length > 0) void onAddFiles(files);
          }}
        />
        <button
          type="button"
          onClick={() => void onRemove()}
          aria-label="Remove divider"
          className="inline-flex h-5 w-5 items-center justify-center rounded-sm text-[color:var(--ink-faint)] transition hover:text-[color:var(--accent-strong)]"
        >
          <Trash2 className="h-3 w-3" />
        </button>
      </div>
    </div>
  );
}

/* ── Photo card (small grid tile) ─────────────────────────────────────── */

function PhotoCard({
  photo,
  editing,
  canMovePrev,
  canMoveNext,
  onMovePrev,
  onMoveNext,
  onStartEdit,
  onCloseEdit,
  onUpdate,
  onRemove,
}: {
  photo: MemoryPhoto;
  editing: boolean;
  canMovePrev: boolean;
  canMoveNext: boolean;
  onMovePrev: () => Promise<void> | void;
  onMoveNext: () => Promise<void> | void;
  onStartEdit: () => void;
  onCloseEdit: () => void;
  onUpdate: (fields: {
    caption?: string;
    location?: string | null;
    locationLat?: number | null;
    locationLng?: number | null;
  }) => Promise<void>;
  onRemove: () => Promise<void>;
}) {
  const caption = (photo.caption || "").trim();
  const location = (photo.location || "").trim();

  return (
    <div className="group flex flex-col gap-1.5">
      {/* Polaroid-style frame — hairline border + paper inset, mirrors
          the read view in PhotoGrid (paper density) so the editor and
          the eventual published view share the same visual language. */}
      <div className="relative border border-[color:var(--border)] bg-[color:var(--paper)] p-1.5">
        <div className="relative aspect-[4/5] overflow-hidden">
          {photo.src ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={photo.src}
              alt={caption || "Gallery photo"}
              className="absolute inset-0 h-full w-full object-cover"
              loading="lazy"
            />
          ) : null}
        </div>

        {/* Reorder pill — prev/next chevrons sharing one rounded shell.
            Mirrors the hover/touch pattern of edit + delete: always
            visible on touch, hover-revealed on pointer devices. */}
        {!editing ? (
          <div className="absolute left-2 top-2 inline-flex items-center rounded-full bg-white/90 shadow-[0_3px_8px_rgba(14,22,34,0.18)] transition [@media(hover:hover)]:opacity-0 [@media(hover:hover)]:group-hover:opacity-100">
            <button
              type="button"
              onClick={() => void onMovePrev()}
              disabled={!canMovePrev}
              aria-label="Move photo earlier"
              className="inline-flex h-6 w-6 items-center justify-center rounded-l-full text-[color:var(--ink)] transition hover:bg-white disabled:cursor-not-allowed disabled:text-[color:var(--ink-faint)] disabled:opacity-50 sm:h-5 sm:w-5"
            >
              <ChevronLeft className="h-2.5 w-2.5" strokeWidth={1.8} />
            </button>
            <span aria-hidden className="h-3 w-px bg-[color:var(--border)]" />
            <button
              type="button"
              onClick={() => void onMoveNext()}
              disabled={!canMoveNext}
              aria-label="Move photo later"
              className="inline-flex h-6 w-6 items-center justify-center rounded-r-full text-[color:var(--ink)] transition hover:bg-white disabled:cursor-not-allowed disabled:text-[color:var(--ink-faint)] disabled:opacity-50 sm:h-5 sm:w-5"
            >
              <ChevronRight className="h-2.5 w-2.5" strokeWidth={1.8} />
            </button>
          </div>
        ) : null}

        {!editing ? (
          <div className="absolute right-2 top-2 flex gap-1 transition [@media(hover:hover)]:opacity-0 [@media(hover:hover)]:group-hover:opacity-100">
            <button
              type="button"
              onClick={onStartEdit}
              aria-label="Edit details"
              className="inline-flex h-6 w-6 items-center justify-center rounded-full bg-white/90 text-[color:var(--ink)] shadow-[0_3px_8px_rgba(14,22,34,0.18)] transition hover:bg-white sm:h-5 sm:w-5"
            >
              <Pencil className="h-2.5 w-2.5" strokeWidth={1.8} />
            </button>
            <button
              type="button"
              onClick={() => void onRemove()}
              aria-label="Remove photo"
              className="inline-flex h-6 w-6 items-center justify-center rounded-full bg-white/90 text-[color:var(--ink)] shadow-[0_3px_8px_rgba(14,22,34,0.18)] transition hover:bg-white hover:text-[color:var(--accent-strong)] sm:h-5 sm:w-5"
            >
              <Trash2 className="h-2.5 w-2.5" strokeWidth={1.8} />
            </button>
          </div>
        ) : null}
      </div>

      {/* Mono caption (+ optional location) below the frame, matching
          the editorial scene style used in subgallery photo grids. */}
      {location || caption ? (
        <div className="font-[family-name:var(--font-mono)] text-[9px] uppercase leading-snug tracking-[0.12em] text-[color:var(--ink-soft)]">
          {location ? (
            <p className="inline-flex items-center gap-1 text-[color:var(--ink-faint)]">
              <MapPin className="h-2 w-2" strokeWidth={1.6} />
              {location}
            </p>
          ) : null}
          {caption ? (
            <p className={`line-clamp-2 ${location ? "mt-0.5" : ""}`}>
              {caption}
            </p>
          ) : null}
        </div>
      ) : null}

      {/* Caption editor — full-viewport centered modal so it isn't
          constrained by the tiny tile bounds on mobile. Caption only;
          location stays read-only here to keep the editor focused. */}
      {editing ? (
        <CaptionEditor
          initialCaption={photo.caption ?? ""}
          onSave={async (next) => {
            if (next !== (photo.caption ?? "")) {
              await onUpdate({ caption: next });
            }
            onCloseEdit();
          }}
          onCancel={onCloseEdit}
        />
      ) : null}
    </div>
  );
}

/* ── Caption editor modal ─────────────────────────────────────────────── */

function CaptionEditor({
  initialCaption,
  onSave,
  onCancel,
}: {
  initialCaption: string;
  onSave: (caption: string) => Promise<void>;
  onCancel: () => void;
}) {
  const [value, setValue] = useState(initialCaption);
  const [saving, setSaving] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement | null>(null);

  // Autofocus the textarea when the modal opens so the keyboard
  // appears immediately on mobile.
  useEffect(() => {
    textareaRef.current?.focus();
  }, []);

  // Lock body scroll while the modal is open so the page underneath
  // doesn't bounce when the on-screen keyboard appears.
  useEffect(() => {
    const previous = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = previous;
    };
  }, []);

  const handleSave = async () => {
    if (saving) return;
    setSaving(true);
    try {
      await onSave(value.trim());
    } finally {
      setSaving(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center bg-[rgba(10,18,30,0.55)] p-4 backdrop-blur-[2px] sm:items-center"
      onClick={(e) => {
        if (e.target === e.currentTarget) onCancel();
      }}
    >
      <div className="w-full max-w-md bg-white shadow-[0_20px_50px_rgba(10,18,30,0.25)]">
        <div className="flex items-center justify-between border-b border-[color:var(--border)] px-4 py-3">
          <span className="text-[11px] font-medium uppercase tracking-[0.2em] text-[color:var(--ink-soft)]">
            Caption
          </span>
          <button
            type="button"
            onClick={onCancel}
            aria-label="Close editor"
            className="inline-flex h-7 w-7 items-center justify-center rounded-full text-[color:var(--ink-soft)] transition hover:bg-[color:var(--hover-tint)] hover:text-[color:var(--ink)]"
          >
            <X className="h-4 w-4" strokeWidth={1.8} />
          </button>
        </div>
        <div className="px-4 py-4">
          <textarea
            ref={textareaRef}
            value={value}
            onChange={(e) => setValue(e.target.value)}
            rows={4}
            placeholder="A short note (optional)"
            className="w-full resize-none border border-[color:var(--border-strong)] bg-white px-3 py-2 text-[14px] leading-6 text-[color:var(--ink)] outline-none focus:border-[color:var(--ink-soft)]"
          />
        </div>
        <div className="flex items-center justify-end gap-2 border-t border-[color:var(--border)] px-4 py-3">
          <button
            type="button"
            onClick={onCancel}
            className="px-3 py-2 text-[12px] font-medium uppercase tracking-[0.18em] text-[color:var(--ink-soft)] transition hover:text-[color:var(--ink)]"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={() => void handleSave()}
            disabled={saving}
            className="bg-[color:var(--ink)] px-4 py-2 text-[12px] font-medium uppercase tracking-[0.18em] text-white transition hover:bg-[color:var(--accent-strong-hover)] disabled:opacity-60"
          >
            {saving ? "Saving…" : "Save"}
          </button>
        </div>
      </div>
    </div>
  );
}
