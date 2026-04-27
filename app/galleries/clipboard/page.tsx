"use client";

import { Plus } from "lucide-react";
import { useState } from "react";
import { AppShell } from "@/components/app-shell";
import { AddMemoryDialog } from "@/components/clipboard/add-memory-dialog";
import { ClipboardCanvas } from "@/components/clipboard/clipboard-canvas";
import { ClipboardCard } from "@/components/clipboard/clipboard-card";
import { pickPromptForToday } from "@/components/clipboard/clipboard-prompts";
import { WorkspaceTopbar } from "@/components/workspace-topbar";
import { Button } from "@/components/ui/button";
import { useClipboardItems } from "@/hooks/use-clipboard-items";

/**
 * Clipboard page — loose-memory MVP.
 *
 * Desktop: a textured "paper" canvas where memories sit at saved
 * positions and can be dragged around. Click empty canvas to drop a
 * new memory there.
 *
 * Mobile: a stacked column with a top-anchored "Add memory" button.
 * Drag is intentionally disabled on touch — chasing positions on a
 * small screen is fiddlier than it's worth at MVP.
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
  // When the user clicks an empty canvas spot, we capture the point so
  // the resulting card lands where they clicked instead of in the
  // hash-based scatter.
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
      <WorkspaceTopbar
        eyebrow="Clipboard"
        title="Today, gathered."
        subtitle={prompt}
        actions={
          <Button
            type="button"
            onClick={() => {
              setSeedPosition(null);
              setDialogOpen(true);
            }}
          >
            <Plus className="h-3.5 w-3.5" />
            Add memory
          </Button>
        }
      />

      {error ? (
        <p className="mb-4 border border-[color:var(--error-border)] bg-[color:var(--error-bg)] px-3 py-2 text-[13px] leading-6 text-[color:var(--error-text)]">
          {error}
        </p>
      ) : null}

      {loading ? (
        <div
          className="memora-clipboard-paper memora-shimmer flex h-[60vh] w-full items-center justify-center"
          aria-busy
        >
          <p className="text-[12px] uppercase tracking-[0.24em] text-[color:var(--ink-faint)]">
            Loading your clipboard…
          </p>
        </div>
      ) : (
        <>
          {/* Desktop canvas */}
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

          {/* Mobile stacked layout */}
          <div className="md:hidden">
            {items.length === 0 ? (
              <div className="memora-clipboard-paper flex min-h-[50vh] flex-col items-center justify-center px-6 py-10 text-center">
                <p className="font-serif text-[18px] italic leading-7 text-[color:var(--ink-soft)]">
                  Drop your first memory.
                </p>
                <p className="mt-2 max-w-[20rem] text-[13px] leading-6 text-[color:var(--ink-soft)]">
                  Anything you don&apos;t want to organize into a gallery — a
                  thought, a photo, both.
                </p>
                <Button
                  type="button"
                  onClick={() => setDialogOpen(true)}
                  className="mt-5"
                >
                  <Plus className="h-3.5 w-3.5" />
                  Add memory
                </Button>
              </div>
            ) : (
              <div className="memora-clipboard-paper flex flex-col items-center gap-4 px-3 py-6">
                {items.map((item) => (
                  <ClipboardCard
                    key={item.id}
                    item={item}
                    onUpdateContent={updateContent}
                    onRemove={removeItem}
                  />
                ))}
              </div>
            )}
          </div>
        </>
      )}

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
