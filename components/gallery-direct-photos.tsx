"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import {
  CalendarPlus,
  GripVertical,
  MapPin,
  Pencil,
  Trash2,
  X,
} from "lucide-react";
import { LocationAutocompleteInput } from "@/components/location-autocomplete-input";
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

  const isEmpty = items.length === 0;

  return (
    <section className="mt-auto pt-12">
      {!isEmpty ? (
        <div className="mb-8 grid grid-cols-3 gap-2 sm:grid-cols-4 sm:gap-3 lg:grid-cols-6">
          {items.map((item) => {
            const isDragging = draggingId === item.data.id;
            const isHover = hoverId === item.data.id;
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
                    onAutoFocusHandled={() => setFocusDividerId(null)}
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
  onAutoFocusHandled,
  onUpdate,
  onRemove,
}: {
  divider: GalleryDivider;
  autoFocus?: boolean;
  onAutoFocusHandled?: () => void;
  onUpdate: (label: string) => Promise<void>;
  onRemove: () => Promise<void>;
}) {
  const [value, setValue] = useState(divider.label);
  const inputRef = useRef<HTMLInputElement | null>(null);

  useEffect(() => {
    if (autoFocus && inputRef.current) {
      inputRef.current.focus();
      inputRef.current.select();
      onAutoFocusHandled?.();
    }
  }, [autoFocus, onAutoFocusHandled]);

  return (
    <div className="group flex items-center gap-2 pt-3">
      <GripVertical className="h-3.5 w-3.5 shrink-0 cursor-grab text-[color:var(--ink-faint)] opacity-0 transition group-hover:opacity-100" />
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
          className="bg-transparent text-left font-serif text-[15px] leading-tight text-[color:var(--ink)] outline-none placeholder:text-[color:var(--ink-faint)] md:text-[16px]"
        />
        <span
          aria-hidden
          className="mt-1 h-px w-8 bg-[color:var(--border-strong)] opacity-70"
        />
      </div>
      <button
        type="button"
        onClick={() => void onRemove()}
        aria-label="Remove divider"
        className="ml-1 rounded-sm p-1 text-[color:var(--ink-faint)] opacity-0 transition hover:text-[color:var(--accent-strong)] group-hover:opacity-100"
      >
        <Trash2 className="h-3 w-3" />
      </button>
    </div>
  );
}

/* ── Photo card (small grid tile) ─────────────────────────────────────── */

function PhotoCard({
  photo,
  editing,
  onStartEdit,
  onCloseEdit,
  onUpdate,
  onRemove,
}: {
  photo: MemoryPhoto;
  editing: boolean;
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
  const captionRef = useRef<HTMLTextAreaElement | null>(null);

  return (
    <div className="group relative aspect-[4/5] overflow-hidden border border-[color:var(--border)] bg-[rgba(255,255,255,0.82)] shadow-[0_8px_20px_rgba(34,49,71,0.05)]">
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={photo.src}
        alt={photo.caption || "Gallery photo"}
        className="absolute inset-0 h-full w-full object-cover"
        loading="lazy"
      />

      {/* Caption + location overlay (only when set) */}
      {!editing && (photo.caption || photo.location) ? (
        <div className="pointer-events-none absolute inset-x-0 bottom-0 bg-gradient-to-t from-[rgba(10,18,30,0.72)] to-transparent px-2 pb-1.5 pt-6 text-white">
          {photo.location ? (
            <p className="inline-flex items-center gap-1 text-[8.5px] font-medium uppercase tracking-[0.2em] text-white/85">
              <MapPin className="h-2 w-2" strokeWidth={1.6} />
              {photo.location}
            </p>
          ) : null}
          {photo.caption ? (
            <p className="mt-0.5 line-clamp-2 text-[10px] leading-[1.35] text-white">
              {photo.caption}
            </p>
          ) : null}
        </div>
      ) : null}

      {/* Hover affordances — top-right edit + delete */}
      {!editing ? (
        <div className="absolute right-1.5 top-1.5 flex gap-1 opacity-0 transition group-hover:opacity-100">
          <button
            type="button"
            onClick={onStartEdit}
            aria-label="Edit details"
            className="inline-flex h-6 w-6 items-center justify-center rounded-full bg-white/90 text-[color:var(--ink)] shadow-[0_3px_8px_rgba(14,22,34,0.18)] transition hover:bg-white"
          >
            <Pencil className="h-3 w-3" strokeWidth={1.8} />
          </button>
          <button
            type="button"
            onClick={() => void onRemove()}
            aria-label="Remove photo"
            className="inline-flex h-6 w-6 items-center justify-center rounded-full bg-white/90 text-[color:var(--ink)] shadow-[0_3px_8px_rgba(14,22,34,0.18)] transition hover:bg-white hover:text-[color:var(--accent-strong)]"
          >
            <Trash2 className="h-3 w-3" strokeWidth={1.8} />
          </button>
        </div>
      ) : null}

      {/* Inline editor — glass overlay covering the tile */}
      {editing ? (
        <div className="absolute inset-0 flex flex-col bg-[rgba(10,18,30,0.62)] backdrop-blur-[2px]">
          <button
            type="button"
            onClick={onCloseEdit}
            aria-label="Close editor"
            className="absolute right-1.5 top-1.5 inline-flex h-6 w-6 items-center justify-center rounded-full bg-white/95 text-[color:var(--ink)] shadow-[0_3px_8px_rgba(14,22,34,0.2)] transition hover:bg-white"
          >
            <X className="h-3 w-3" strokeWidth={1.8} />
          </button>
          <div className="mt-auto space-y-1.5 bg-white/96 p-2">
            <div>
              <label className="text-[8.5px] font-medium uppercase tracking-[0.2em] text-[color:var(--ink-soft)]">
                Location
              </label>
              <div className="mt-0.5">
                <LocationAutocompleteInput
                  value={{
                    label: photo.location ?? "",
                    lat: photo.locationLat ?? null,
                    lng: photo.locationLng ?? null,
                  }}
                  onChange={(next) =>
                    void onUpdate({
                      location: next.label || null,
                      locationLat: next.lat,
                      locationLng: next.lng,
                    })
                  }
                  placeholder="Optional"
                  className="w-full border border-[color:var(--border-strong)] bg-white px-2 py-1 text-[10.5px] text-[color:var(--ink)] outline-none focus:border-[color:var(--ink-soft)]"
                />
              </div>
            </div>
            <div>
              <label className="text-[8.5px] font-medium uppercase tracking-[0.2em] text-[color:var(--ink-soft)]">
                Caption
              </label>
              <textarea
                ref={captionRef}
                key={photo.caption ?? ""}
                defaultValue={photo.caption ?? ""}
                onBlur={() => {
                  const next = captionRef.current?.value ?? "";
                  if (next !== (photo.caption ?? "")) {
                    void onUpdate({ caption: next });
                  }
                }}
                rows={2}
                placeholder="A short note (optional)"
                className="mt-0.5 w-full resize-none border border-[color:var(--border-strong)] bg-white px-2 py-1 text-[10.5px] leading-4 text-[color:var(--ink)] outline-none focus:border-[color:var(--ink-soft)]"
              />
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
