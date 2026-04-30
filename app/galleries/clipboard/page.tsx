"use client";

import { Plus } from "lucide-react";
import { useState } from "react";
import { AppShell } from "@/components/app-shell";
import { AddMemoryDialog } from "@/components/clipboard/add-memory-dialog";
import { ClipboardCanvas } from "@/components/clipboard/clipboard-canvas";
import { ClipboardCard } from "@/components/clipboard/clipboard-card";
import { pickPromptForToday } from "@/components/clipboard/clipboard-prompts";
import { useClipboardItems } from "@/hooks/use-clipboard-items";

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
    updatePosition,
    removeItem,
  } = useClipboardItems();

  const [dialogOpen, setDialogOpen] = useState(false);
  const [seedPosition, setSeedPosition] = useState<{ x: number; y: number } | null>(
    null,
  );

  const prompt = pickPromptForToday();

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
          className="pointer-events-none absolute left-5 right-5 top-6 z-20 max-w-2xl md:left-12 md:top-12"
        >
          <p className="text-[10px] font-medium uppercase tracking-[0.24em] text-[color:var(--ink-soft)]">
            Your scraps are worth keeping
          </p>
          {/*
            Title IS the rotating prompt. Today's prompt is picked
            deterministically by date in pickPromptForToday() so the
            user sees the same heading all day, then a fresh one
            tomorrow.
          */}
          <h1
            id="clipboard-title"
            className="mt-2 font-serif text-[34px] leading-[0.96] text-[color:var(--ink)] md:mt-3 md:text-[58px] md:leading-[0.94]"
          >
            {prompt}
          </h1>
          {/*
            Tiny inline loading caption — sits in the title block so the
            warm paper background paints from the very first frame and
            the user never sees a mismatched gray "Loading…" panel.
          */}
          {loading ? (
            <p className="mt-3 text-[10.5px] font-medium uppercase tracking-[0.22em] text-[color:var(--ink-faint)]">
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
                onRemove={removeItem}
                onAddAtPosition={(x, y) => {
                  setSeedPosition({ x, y });
                  setDialogOpen(true);
                }}
              />
            </div>

            {/* Mobile: stacked column. Hidden on desktop. */}
            <div className="md:hidden">
              {items.length === 0 ? (
                <div className="flex min-h-full flex-col items-center justify-center px-6 pb-24 pt-48 text-center">
                  <p className="font-serif text-[18px] italic leading-7 text-[color:var(--ink-soft)]">
                    Drop your first memory.
                  </p>
                  <p className="mt-2 max-w-[20rem] text-[13px] leading-6 text-[color:var(--ink-soft)]">
                    Anything you don&apos;t want to organize into a gallery —
                    a thought, a photo, both.
                  </p>
                </div>
              ) : (
                <div className="flex flex-col items-center gap-4 px-3 pb-24 pt-44">
                  {items.map((item, index) => (
                    <ClipboardCard
                      key={item.id}
                      item={item}
                      onUpdateContent={updateContent}
                      onRemove={removeItem}
                      // First few cards in the mobile stack are
                      // above-the-fold or just below; preload them
                      // eagerly so the first paint isn't a stack of
                      // empty paper tiles.
                      priority={index < 3}
                    />
                  ))}
                </div>
              )}

              <button
                type="button"
                onClick={() => setDialogOpen(true)}
                aria-label="Add memory"
                className="fixed bottom-5 right-5 z-30 inline-flex h-12 w-12 items-center justify-center rounded-full bg-[color:var(--ink)] text-white shadow-[0_12px_28px_-10px_rgba(14,22,34,0.45)] transition hover:bg-[color:var(--ink-soft)]"
              >
                <Plus className="h-4 w-4" strokeWidth={2} />
              </button>
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
