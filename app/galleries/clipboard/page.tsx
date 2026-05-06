"use client";

import { Plus } from "lucide-react";
import { useState } from "react";
import { AppShell } from "@/components/app-shell";
import { AddMemoryDialog } from "@/components/clipboard/add-memory-dialog";
import { ClipboardCanvas } from "@/components/clipboard/clipboard-canvas";
import { ClipboardCard } from "@/components/clipboard/clipboard-card";
import { ClipboardDetailSheet } from "@/components/clipboard/clipboard-detail-sheet";
import {
  useClipboardItems,
  type ClipboardItem,
} from "@/hooks/use-clipboard-items";

// Tilt is computed inside ClipboardCard from item.id so both the
// mobile compact stack and the desktop drag-canvas share the same
// "pinned at slightly different angles" treatment. The page no longer
// needs to forward a tilt prop — the card resolves it itself.

/**
 * Clipboard page — full-bleed paper surface that fills the workspace
 * viewport from the header down to the bottom edge. The title block
 * (eyebrow + heading + rotating prompt) sits directly on the paper as
 * floating editorial text — no chrome, no card.
 *
 * Desktop: drag cards anywhere on the canvas; click empty space to drop
 * a new memory there. Mobile: stacked column that scrolls inside the
 * same paper surface; a small floating "+" button opens the dialog.
 */

export default function ClipboardPage() {
  const {
    items,
    loading,
    error,
    addItem,
    updateContent,
    updatePhotoSize,
    updatePosition,
    removeItem,
  } = useClipboardItems();

  const [dialogOpen, setDialogOpen] = useState(false);
  const [seedPosition, setSeedPosition] = useState<{ x: number; y: number } | null>(
    null,
  );
  // Mobile-only: which scrap is open in the detail sheet. We hold the
  // ID rather than the item itself so a re-fetched list (e.g. after an
  // edit) keeps the sheet bound to fresh data.
  const [detailItemId, setDetailItemId] = useState<string | null>(null);
  const detailItem: ClipboardItem | null =
    detailItemId == null
      ? null
      : items.find((entry) => entry.id === detailItemId) ?? null;

  const handleAdd = async (input: {
    layoutType: "text" | "photo" | "text_photo";
    content?: string | null;
    file?: File | null;
  }) => {
    await addItem({
      layoutType: input.layoutType,
      content: input.content,
      file: input.file,
      xPosition: seedPosition?.x ?? null,
      yPosition: seedPosition?.y ?? null,
    });
    setSeedPosition(null);
  };

  return (
    <AppShell accent="immersive">
      <div aria-hidden className="sr-only">
        Clipboard is rendered as a full-bleed paper surface below the site
        header.
      </div>

      {/*
        One full-bleed section for both viewports. workspace-shell.tsx
        publishes --workspace-sidebar-width and --workspace-chrome-top so
        we can pin to the right edge of the sidebar on desktop and below
        the mobile chrome on mobile, matching the Memory Map approach.
      */}
      <section
        aria-labelledby="clipboard-title"
        style={{
          left: "var(--workspace-sidebar-width, 0px)",
          top: "var(--workspace-chrome-top, 0px)",
          transition:
            "left 320ms cubic-bezier(0.22, 1, 0.36, 1), top 320ms cubic-bezier(0.22, 1, 0.36, 1)",
        }}
        className="memora-clipboard-paper fixed bottom-0 right-0 z-0 overflow-y-auto overflow-x-hidden"
      >
        {/*
          Editorial header — sits on the paper as fixed text. On desktop
          it's positioned in the upper-left of the canvas; on mobile it
          flows above the stacked cards. pointer-events-none on desktop
          so clicks-to-add still pass through to the canvas underneath.
        */}
        <header
          data-tour-id="clipboard-prompt"
          className="pointer-events-none absolute left-4 right-4 top-14 z-20 max-w-2xl md:left-12 md:top-12"
        >
          <p className="text-[9px] font-medium uppercase tracking-[0.22em] text-[color:var(--ink-soft)] md:text-[10px] md:tracking-[0.24em]">
            Your scraps are worth keeping
          </p>
          <h1
            id="clipboard-title"
            className="mt-1.5 font-serif text-[19px] leading-[1.15] text-[color:var(--ink)] md:mt-3 md:text-[58px] md:leading-[0.94]"
          >
            What&apos;s on your mind?
          </h1>
          {/*
            Tiny inline loading caption — sits in the title block so the
            warm paper background paints from the very first frame and
            the user never sees a mismatched gray "Loading…" panel.
          */}
          {loading ? (
            <p className="mt-2 text-[9.5px] font-medium uppercase tracking-[0.2em] text-[color:var(--ink-faint)] md:mt-3 md:text-[10.5px] md:tracking-[0.22em]">
              Loading…
            </p>
          ) : null}
        </header>

        {error ? (
          <p className="absolute left-1/2 top-3 z-30 -translate-x-1/2 border border-[color:var(--error-border)] bg-[color:var(--error-bg)] px-3 py-2 text-[13px] leading-6 text-[color:var(--error-text)]">
            {error}
          </p>
        ) : null}

        {loading ? null : (
          <>
            {/* Desktop: drag canvas. Hidden on mobile. */}
            <div className="hidden md:block">
              <ClipboardCanvas
                items={items}
                onUpdatePosition={updatePosition}
                onUpdateContent={updateContent}
                onUpdatePhotoSize={updatePhotoSize}
                onRemove={removeItem}
                onAddAtPosition={(x, y) => {
                  setSeedPosition({ x, y });
                  setDialogOpen(true);
                }}
              />
            </div>

            {/* Mobile: 2-col masonry of compact "scrap on a clipboard"
                cards. Each card is content-driven (small thumbnail,
                short serif text, or face-down word-count tile) and
                gently tilted to feel pinned. Tapping opens the detail
                sheet for full content + edit + delete. Hidden on
                desktop where the drag-canvas takes over. */}
            <div className="md:hidden">
              {items.length === 0 ? (
                <div className="flex min-h-full flex-col items-center justify-center px-6 pb-24 pt-32 text-center">
                  <p className="font-serif text-[18px] italic leading-7 text-[color:var(--ink-soft)]">
                    Drop your first memory.
                  </p>
                  <p className="mt-2 max-w-[20rem] text-[13px] leading-6 text-[color:var(--ink-soft)]">
                    Anything you don&apos;t want to organize into a gallery —
                    a thought, a photo, both.
                  </p>
                </div>
              ) : (
                <div className="columns-2 gap-3 px-3 pb-28 pt-32 [column-fill:_balance]">
                  {items.map((item, index) => (
                    <div key={item.id} className="mb-3 break-inside-avoid">
                      <ClipboardCard
                        item={item}
                        onUpdateContent={updateContent}
                        onRemove={removeItem}
                        variant="compact"
                        onOpenDetail={setDetailItemId}
                        // First few thumbnails are above-the-fold or
                        // just below; preload them eagerly so the
                        // initial paint isn't a stack of empty paper.
                        priority={index < 4}
                      />
                    </div>
                  ))}
                </div>
              )}

              <button
                type="button"
                onClick={() => setDialogOpen(true)}
                aria-label="Add memory"
                style={{
                  bottom:
                    "calc(env(safe-area-inset-bottom, 0px) + var(--memora-bottom-banner, 0px) + 1.25rem)",
                }}
                className="fixed right-5 z-30 inline-flex h-14 w-14 items-center justify-center rounded-full bg-[color:var(--ink)] text-white shadow-[0_12px_28px_-10px_rgba(14,22,34,0.45)] transition hover:bg-[color:var(--ink-soft)] md:h-12 md:w-12"
              >
                <Plus className="h-4 w-4" strokeWidth={2} />
              </button>

              <ClipboardDetailSheet
                item={detailItem}
                onClose={() => setDetailItemId(null)}
                onUpdateContent={updateContent}
                onUpdatePhotoSize={updatePhotoSize}
                onRemove={removeItem}
              />
            </div>
          </>
        )}
      </section>

      <AddMemoryDialog
        open={dialogOpen}
        onOpenChange={(next) => {
          if (!next) setSeedPosition(null);
          setDialogOpen(next);
        }}
        onSubmit={handleAdd}
      />
    </AppShell>
  );
}
