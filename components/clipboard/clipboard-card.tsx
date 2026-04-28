"use client";

import { Pencil, Trash2 } from "lucide-react";
import Image from "next/image";
import { useEffect, useRef, useState } from "react";
import type { ClipboardItem } from "@/hooks/use-clipboard-items";

/**
 * One memory card.
 *
 * Three layout variants — text, photo, text+photo — each rendered as a
 * "soft paper" tile: warm off-white surface, hairline border, gentle
 * shadow. Hovering reveals the edit + delete affordances. Editing is
 * inline (textarea swaps for the text block) so the user never leaves
 * the canvas.
 *
 * The card itself doesn't know about positioning — that's the canvas's
 * job. The card just renders content.
 */

function formatDate(iso: string) {
  try {
    const date = new Date(iso);
    return date.toLocaleString("en-US", {
      month: "short",
      day: "numeric",
      hour: "numeric",
      minute: "2-digit",
    });
  } catch {
    return "";
  }
}

export function ClipboardCard({
  item,
  onUpdateContent,
  onRemove,
  draggable = false,
  priority = false,
}: {
  item: ClipboardItem;
  onUpdateContent: (id: string, content: string) => Promise<void>;
  onRemove: (id: string) => Promise<void>;
  draggable?: boolean;
  /**
   * When true, the cover image is preloaded eagerly with high
   * fetchPriority. The canvas marks the first few cards in the list
   * as priority so the browser stops queueing them behind the rest of
   * the page's resources.
   */
  priority?: boolean;
}) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(item.content ?? "");
  const textareaRef = useRef<HTMLTextAreaElement | null>(null);

  // Auto-focus + select when entering edit mode. The draft is seeded
  // from item.content at the moment editing flips on (handled by the
  // edit button below) rather than via a sync effect — avoids the
  // setState-in-effect cascade.
  useEffect(() => {
    if (editing && textareaRef.current) {
      textareaRef.current.focus();
      textareaRef.current.select();
    }
  }, [editing]);

  const commitEdit = async () => {
    setEditing(false);
    if (draft.trim() === (item.content ?? "")) return;
    try {
      await onUpdateContent(item.id, draft.trim());
    } catch (err) {
      console.error("Memora clipboard: edit failed", err);
    }
  };

  const dateLabel = formatDate(item.createdAt);
  const hasText = Boolean(item.content?.trim()) || editing;
  const hasPhoto = Boolean(item.photoUrl);

  return (
    <article
      // group + transition for the hover affordances; don't use motion.div
      // here to keep the drag transform simple and predictable.
      className={`group relative flex h-full w-full max-w-[20rem] flex-col overflow-hidden border border-[color:var(--border)] bg-[#fdf9f1] shadow-[0_8px_22px_-14px_rgba(60,46,30,0.28)] transition ${
        draggable ? "cursor-grab active:cursor-grabbing" : ""
      }`}
      style={{
        // Subtle warm paper texture via a layered gradient — premium feel
        // without an external image.
        backgroundImage:
          "radial-gradient(circle at 20% 20%, rgba(255,255,255,0.6) 0%, transparent 60%), radial-gradient(circle at 80% 80%, rgba(193,168,128,0.08) 0%, transparent 70%)",
      }}
    >
      {hasPhoto ? (
        // Stop drag on the image so the user can long-press / right-click
        // it without it grabbing the card. Pointer events too — the
        // canvas listens for pointerdown.
        <div
          className="relative aspect-[4/3] w-full overflow-hidden bg-[color:var(--paper-strong)]"
          onPointerDown={(e) => e.stopPropagation()}
          onMouseDown={(e) => e.stopPropagation()}
        >
          {item.photoUrl ? (
            <Image
              src={item.photoUrl}
              alt={item.content ?? "Clipboard memory"}
              fill
              // Card is hard-bounded to max-w-[20rem] (320px) on every
              // breakpoint, so a tighter sizes hint stops the optimizer
              // from fetching a 90vw-sized variant on phones for an
              // image we'll only ever paint at 320 CSS pixels.
              sizes="320px"
              // 75 is Next.js 16's default-allowed quality bucket and
              // produces ~30% smaller AVIF/WebP than 82 with no
              // perceptible difference at thumbnail size.
              quality={75}
              priority={priority}
              draggable={false}
              className="object-cover"
            />
          ) : null}
        </div>
      ) : null}

      <div className={`flex flex-1 flex-col px-4 py-3.5 ${hasPhoto ? "" : "min-h-[8rem]"}`}>
        {hasText ? (
          editing ? (
            <textarea
              ref={textareaRef}
              value={draft}
              onChange={(e) => setDraft(e.target.value)}
              onBlur={() => void commitEdit()}
              onKeyDown={(e) => {
                if (e.key === "Escape") {
                  setDraft(item.content ?? "");
                  setEditing(false);
                }
                if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) {
                  e.preventDefault();
                  void commitEdit();
                }
              }}
              onPointerDown={(e) => e.stopPropagation()}
              onMouseDown={(e) => e.stopPropagation()}
              rows={Math.max(3, draft.split("\n").length + 1)}
              className="w-full resize-none border-none bg-transparent font-serif text-[14.5px] leading-7 text-[color:var(--ink)] outline-none"
              placeholder="…"
            />
          ) : (
            <p className="whitespace-pre-wrap font-serif text-[14.5px] leading-7 text-[color:var(--ink)]">
              {item.content}
            </p>
          )
        ) : null}

        <p className="mt-auto pt-3 text-[10px] font-medium uppercase tracking-[0.22em] text-[color:var(--ink-faint)]">
          {dateLabel}
        </p>
      </div>

      {/*
        Hover affordances. We stop pointerdown (not just mousedown) so
        the canvas's drag-start listener — which uses pointer events —
        doesn't kidnap the click and end up writing a new position when
        the user only meant to tap the trash or pencil.
      */}
      <div
        className="absolute right-2 top-2 flex gap-1 opacity-0 transition group-hover:opacity-100"
        onPointerDown={(e) => e.stopPropagation()}
        onMouseDown={(e) => e.stopPropagation()}
      >
        {item.layoutType !== "photo" ? (
          <button
            type="button"
            onClick={() => {
              // Seed the draft from the latest prop at the moment we
              // switch into edit mode — keeps the editor in sync without
              // a state-syncing effect.
              setDraft(item.content ?? "");
              setEditing(true);
            }}
            aria-label="Edit memory"
            className="inline-flex h-7 w-7 items-center justify-center rounded-full bg-white/95 text-[color:var(--ink)] shadow-[0_3px_8px_rgba(14,22,34,0.18)] transition hover:bg-white"
          >
            <Pencil className="h-3.5 w-3.5" strokeWidth={1.8} />
          </button>
        ) : null}
        <button
          type="button"
          onClick={() => {
            if (window.confirm("Delete this memory?")) {
              void onRemove(item.id);
            }
          }}
          aria-label="Delete memory"
          className="inline-flex h-7 w-7 items-center justify-center rounded-full bg-white/95 text-[color:var(--ink)] shadow-[0_3px_8px_rgba(14,22,34,0.18)] transition hover:bg-white hover:text-[#9a4545]"
        >
          <Trash2 className="h-3.5 w-3.5" strokeWidth={1.8} />
        </button>
      </div>
    </article>
  );
}
