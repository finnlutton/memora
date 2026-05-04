"use client";

import * as Dialog from "@radix-ui/react-dialog";
import { Pencil, Trash2, X } from "lucide-react";
import Image from "next/image";
import { useEffect, useRef, useState } from "react";
import { ConfirmDeleteDialog } from "@/components/confirm-delete-dialog";
import type { ClipboardItem } from "@/hooks/use-clipboard-items";

/**
 * Bottom sheet that surfaces a single clipboard memory in full on mobile,
 * with edit + delete controls. Opened from a tap on a compact
 * `ClipboardCard` — solves the "edit/delete are hover-only" bug for
 * touch users while letting the dense scrap view stay tap-to-open.
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

export function ClipboardDetailSheet({
  item,
  onClose,
  onUpdateContent,
  onRemove,
}: {
  item: ClipboardItem | null;
  onClose: () => void;
  onUpdateContent: (id: string, content: string) => Promise<void>;
  onRemove: (id: string) => Promise<void>;
}) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState("");
  const textareaRef = useRef<HTMLTextAreaElement | null>(null);

  // Reset edit state whenever the underlying item changes (e.g. user
  // closes the sheet for one memory and opens another).
  useEffect(() => {
    if (!item) {
      setEditing(false);
      setDraft("");
      return;
    }
    setDraft(item.content ?? "");
  }, [item]);

  useEffect(() => {
    if (editing && textareaRef.current) {
      textareaRef.current.focus();
    }
  }, [editing]);

  const open = item != null;

  if (!item) {
    // Render a closed Radix root so transitions don't whiplash on close.
    return null;
  }

  const dateLabel = formatDate(item.createdAt);
  const hasPhoto = Boolean(item.photoUrl);
  const hasText = Boolean(item.content?.trim());

  const commitEdit = async () => {
    setEditing(false);
    if (draft.trim() === (item.content ?? "")) return;
    try {
      await onUpdateContent(item.id, draft.trim());
    } catch (err) {
      console.error("Memora clipboard: edit failed", err);
    }
  };

  return (
    <Dialog.Root
      open={open}
      onOpenChange={(next) => {
        if (!next) onClose();
      }}
    >
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 z-50 bg-[rgba(9,14,22,0.42)] backdrop-blur-sm" />
        <Dialog.Content
          aria-describedby={undefined}
          style={{
            paddingBottom: "calc(env(safe-area-inset-bottom, 0px) + 1rem)",
          }}
          className="fixed inset-x-0 bottom-0 z-50 max-h-[90dvh] overflow-y-auto rounded-t-[1.25rem] border-t border-[color:var(--border-strong)] bg-[#fdf9f1] p-4 shadow-[0_-18px_48px_rgba(14,22,34,0.18)]"
        >
          <Dialog.Title className="sr-only">Memory detail</Dialog.Title>

          <div className="flex items-center justify-between gap-3">
            <p className="text-[10px] font-medium uppercase tracking-[0.22em] text-[color:var(--ink-faint)]">
              {dateLabel}
            </p>
            <Dialog.Close asChild>
              <button
                type="button"
                aria-label="Close memory"
                className="-mr-1 inline-flex h-9 w-9 items-center justify-center rounded-full text-[color:var(--ink-soft)] transition hover:bg-[rgba(22,35,56,0.06)] hover:text-[color:var(--ink)]"
              >
                <X className="h-4 w-4" />
              </button>
            </Dialog.Close>
          </div>

          {hasPhoto && item.photoUrl ? (
            <div className="relative mt-3 aspect-[4/3] w-full overflow-hidden rounded-md bg-[color:var(--paper-strong)]">
              <Image
                src={item.photoUrl}
                alt={item.content ?? "Clipboard memory"}
                fill
                sizes="100vw"
                quality={75}
                className="object-cover"
              />
            </div>
          ) : null}

          {/* Note body — always rendered. Photo-only items can now
              receive a caption later, so we surface the same edit
              affordance for every memory shape (the action button
              below renames itself based on whether text exists). */}
          <div className="mt-3">
            {editing ? (
              <textarea
                ref={textareaRef}
                value={draft}
                onChange={(event) => setDraft(event.target.value)}
                onBlur={() => void commitEdit()}
                onKeyDown={(event) => {
                  if (event.key === "Escape") {
                    setDraft(item.content ?? "");
                    setEditing(false);
                  }
                  if (event.key === "Enter" && (event.metaKey || event.ctrlKey)) {
                    event.preventDefault();
                    void commitEdit();
                  }
                }}
                rows={Math.max(4, draft.split("\n").length + 1)}
                className="w-full resize-none border-none bg-transparent font-serif text-base leading-7 text-[color:var(--ink)] outline-none"
                placeholder={hasText ? "…" : "Write a caption for this photo…"}
              />
            ) : hasText ? (
              <p className="whitespace-pre-wrap font-serif text-base leading-7 text-[color:var(--ink)]">
                {item.content}
              </p>
            ) : (
              <p className="font-serif text-base italic leading-7 text-[color:var(--ink-faint)]">
                {hasPhoto
                  ? "No caption yet — tap Add caption to write one."
                  : "No note yet — tap Edit to add one."}
              </p>
            )}
          </div>

          <div className="mt-5 flex items-center justify-end gap-2">
            <button
              type="button"
              onClick={() => {
                if (editing) {
                  void commitEdit();
                } else {
                  setDraft(item.content ?? "");
                  setEditing(true);
                }
              }}
              className="inline-flex h-10 items-center gap-1.5 rounded-full border border-[color:var(--border-strong)] bg-transparent px-3.5 text-[11px] font-medium uppercase tracking-[0.16em] text-[color:var(--ink)] transition hover:bg-[color:var(--paper)]"
            >
              <Pencil className="h-3.5 w-3.5" />
              {editing ? "Save" : hasText ? "Edit" : "Add caption"}
            </button>
            <ConfirmDeleteDialog
              title="Delete this memory?"
              description="This memory will be removed from your clipboard. This can't be undone."
              onConfirm={async () => {
                await onRemove(item.id);
                onClose();
              }}
              trigger={
                <button
                  type="button"
                  className="inline-flex h-10 items-center gap-1.5 rounded-full border border-[#c98282] bg-[#fff7f7] px-3.5 text-[11px] font-medium uppercase tracking-[0.16em] text-[#9a4545] transition hover:bg-[#fff1f1]"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                  Delete
                </button>
              }
            />
          </div>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
