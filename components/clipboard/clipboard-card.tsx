"use client";

import { Pencil, Trash2 } from "lucide-react";
import Image from "next/image";
import { useEffect, useRef, useState } from "react";
import { ConfirmDeleteDialog } from "@/components/confirm-delete-dialog";
import { cn } from "@/lib/utils";
import type { ClipboardItem } from "@/hooks/use-clipboard-items";

/**
 * Threshold below which a text-only scrap shows its content inline (line
 * clamp 3) instead of collapsing to a "{N} words · {date}" face-down
 * scrap. Tuned so common short notes ("call mom", "Granada window light")
 * stay visible at a glance and longer journal-style entries stay tucked
 * behind a tap.
 */
const SHORT_TEXT_THRESHOLD = 60;

/**
 * Card tilt — applied to the whole scrap so cards feel pinned at slightly
 * different angles. Five-step cycle keyed off the item id so the same
 * memory keeps the same tilt across renders / refetches.
 */
const CARD_TILT_ANGLES = [-1.6, -0.9, 0, 1, 1.7];

/**
 * Photo tilt — applied to the inner photo container so the image looks
 * stuck onto its scrap at a slightly different angle than the card.
 * Different hash multiplier from the card so a card and its photo don't
 * always lean the same way.
 */
const PHOTO_TILT_ANGLES = [-0.7, -0.3, 0.5, 0.8, -0.5];

function hashId(id: string, multiplier: number): number {
  let hash = 0;
  for (let i = 0; i < id.length; i++) {
    hash = (hash * multiplier + id.charCodeAt(i)) | 0;
  }
  return Math.abs(hash);
}

export function cardTiltFor(id: string): number {
  return CARD_TILT_ANGLES[hashId(id, 31) % CARD_TILT_ANGLES.length];
}

function photoTiltFor(id: string): number {
  return PHOTO_TILT_ANGLES[hashId(id, 37) % PHOTO_TILT_ANGLES.length];
}

/**
 * Tiny "thumbtack" indicator at the top of every clipboard scrap. Subtle
 * inset highlight + drop shadow gives a hint of dimension without being
 * literal about it.
 */
function PinDot() {
  return (
    <span
      aria-hidden="true"
      className="absolute left-1/2 top-1 z-10 block h-2 w-2 -translate-x-1/2 rounded-full bg-[color:var(--ink-soft)] shadow-[inset_0_0_0_1px_rgba(255,255,255,0.18),0_1px_2px_rgba(14,22,34,0.32)]"
    />
  );
}

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
  variant = "default",
  tilt = 0,
  onOpenDetail,
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
  /**
   * "default" — the desktop drag-canvas tile (full-size, hover
   * affordances, inline editing). "compact" — mobile scrap-on-a-board
   * variant: small, content-driven sizing, tap-to-open-detail. Edit and
   * delete on compact lives in the detail sheet (the in-card hover
   * affordances aren't reachable on touch).
   */
  variant?: "default" | "compact";
  /**
   * Tilt angle in degrees applied as a transform — gives the compact
   * mobile cards their "pinned scrap" character. Ignored on default.
   */
  tilt?: number;
  /**
   * Compact-only callback fired when the card is tapped. Wires the
   * card up to the parent's detail sheet so editing and deleting stay
   * possible without on-card hover.
   */
  onOpenDetail?: (id: string) => void;
}) {
  if (variant === "compact") {
    return (
      <CompactClipboardCard
        item={item}
        // Allow callers to override (page can pin all-zero for testing,
        // etc.) but otherwise compute from the item id so the same scrap
        // keeps the same tilt across renders.
        tilt={tilt ?? cardTiltFor(item.id)}
        priority={priority}
        onOpenDetail={onOpenDetail}
      />
    );
  }

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

  const cardTilt = cardTiltFor(item.id);
  const photoTilt = photoTiltFor(item.id);

  return (
    <article
      // group + transition for the hover affordances; don't use motion.div
      // here to keep the drag transform simple and predictable.
      className={`group relative flex h-full w-full max-w-[20rem] flex-col overflow-hidden border border-[color:var(--border)] bg-[#fdf9f1] shadow-[0_8px_22px_-14px_rgba(60,46,30,0.28)] transition ${
        draggable ? "cursor-grab active:cursor-grabbing" : ""
      }`}
      style={{
        // Card tilt — gives every scrap on the desktop canvas (and the
        // mobile compact stack uses its own copy of this) a slightly
        // pinned-at-an-angle feel. Combined with the canvas wrapper's
        // drag-time scale via separate transforms on different
        // elements, so the two don't fight.
        transform: `rotate(${cardTilt}deg)`,
        // Subtle warm paper texture via a layered gradient — premium feel
        // without an external image.
        backgroundImage:
          "radial-gradient(circle at 20% 20%, rgba(255,255,255,0.6) 0%, transparent 60%), radial-gradient(circle at 80% 80%, rgba(193,168,128,0.08) 0%, transparent 70%)",
      }}
    >
      <PinDot />
      {hasPhoto ? (
        // Stop drag on the image so the user can long-press / right-click
        // it without it grabbing the card. Pointer events too — the
        // canvas listens for pointerdown.
        <div
          className="relative aspect-[4/3] w-full overflow-hidden bg-[color:var(--paper-strong)]"
          style={{ transform: `rotate(${photoTilt}deg)` }}
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
              className="w-full resize-none border-none bg-transparent font-serif text-base leading-7 text-[color:var(--ink)] outline-none md:text-[14.5px]"
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
        <ConfirmDeleteDialog
          title="Delete this memory?"
          description="This memory will be removed from your clipboard. This can't be undone."
          onConfirm={() => void onRemove(item.id)}
          trigger={
            <button
              type="button"
              aria-label="Delete memory"
              className="inline-flex h-7 w-7 items-center justify-center rounded-full bg-white/95 text-[color:var(--ink)] shadow-[0_3px_8px_rgba(14,22,34,0.18)] transition hover:bg-white hover:text-[#9a4545]"
            >
              <Trash2 className="h-3.5 w-3.5" strokeWidth={1.8} />
            </button>
          }
        />
      </div>
    </article>
  );
}

/**
 * Compact ("scrap on a clipboard") variant used on mobile only. Sized
 * to the content type:
 *  - photo only: small portrait thumbnail
 *  - photo + text: square thumbnail + 1-line caption
 *  - short text: serif paragraph clamped to 3 lines
 *  - long text: face-down "{N} words · {date}" tile
 *
 * The card is a single button — tap opens the detail sheet, where
 * editing and deleting live (the default-variant hover affordances
 * aren't reachable on touch).
 */
function CompactClipboardCard({
  item,
  tilt,
  priority,
  onOpenDetail,
}: {
  item: ClipboardItem;
  tilt: number;
  priority: boolean;
  onOpenDetail?: (id: string) => void;
}) {
  const dateLabel = formatDate(item.createdAt);
  const text = (item.content ?? "").trim();
  const hasText = text.length > 0;
  const hasPhoto = Boolean(item.photoUrl);
  const isShortText = hasText && text.length <= SHORT_TEXT_THRESHOLD;
  const wordCount = hasText
    ? text.split(/\s+/).filter(Boolean).length
    : 0;
  const photoTilt = photoTiltFor(item.id);

  return (
    <button
      type="button"
      onClick={() => onOpenDetail?.(item.id)}
      style={{ transform: `rotate(${tilt}deg)` }}
      aria-label={
        text
          ? `Open memory: ${text.slice(0, 40)}${text.length > 40 ? "…" : ""}`
          : "Open memory"
      }
      className="group relative block w-full overflow-hidden border border-[color:var(--border)] bg-[#fdf9f1] text-left shadow-[0_8px_22px_-14px_rgba(60,46,30,0.32)] transition-transform active:translate-y-[1px] active:scale-[0.99]"
    >
      <PinDot />

      {hasPhoto && item.photoUrl ? (
        <div
          className={cn(
            "relative w-full overflow-hidden bg-[color:var(--paper-strong)]",
            // Square when paired with text so the caption has room
            // beneath; portrait when photo is the whole scrap so the
            // image gets a touch more vertical presence.
            hasText ? "aspect-square" : "aspect-[3/4]",
          )}
          style={{ transform: `rotate(${photoTilt}deg)` }}
        >
          <Image
            src={item.photoUrl}
            alt={text || "Clipboard memory"}
            fill
            // Compact column is ~165-180px wide on a 375 viewport (2-col
            // gap-3, px-3). 200px sizes hint stops the optimizer from
            // pulling a full-screen variant.
            sizes="200px"
            quality={75}
            priority={priority}
            draggable={false}
            className="object-cover"
          />
        </div>
      ) : null}

      {/* Inline body — short text gets serif prose; long text gets a
          word-count + date face-down tile. Photo+text pairs show the
          caption clamped to a single line below the image. */}
      {hasText ? (
        isShortText ? (
          <p
            className={cn(
              "px-3 font-serif text-[13px] leading-[1.45] text-[color:var(--ink)]",
              hasPhoto ? "line-clamp-1 pt-2" : "line-clamp-3 pt-3",
            )}
          >
            {text}
          </p>
        ) : !hasPhoto ? (
          <p className="px-3 pt-4 text-[10.5px] font-medium uppercase tracking-[0.18em] text-[color:var(--ink-soft)]">
            {wordCount} {wordCount === 1 ? "word" : "words"}
          </p>
        ) : (
          // Photo + long text: still keep a single hint line so the user
          // sees there IS text behind the image, just rendered tightly.
          <p className="line-clamp-1 px-3 pt-2 text-[10.5px] font-medium uppercase tracking-[0.18em] text-[color:var(--ink-soft)]">
            {wordCount} {wordCount === 1 ? "word" : "words"}
          </p>
        )
      ) : null}

      <p className="px-3 pb-2 pt-2 text-[9.5px] font-medium uppercase tracking-[0.2em] text-[color:var(--ink-faint)]">
        {dateLabel}
      </p>
    </button>
  );
}
