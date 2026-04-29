"use client";

import type { ReactNode } from "react";
import * as AlertDialog from "@radix-ui/react-alert-dialog";
import { Button } from "@/components/ui/button";

/**
 * In-app delete confirmation dialog. Supply either `triggerLabel`
 * (renders our default ghost-button trigger) or `trigger` (any
 * custom node — typically an icon button) so callers can keep
 * their own visual treatment while still getting the styled modal.
 *
 * `confirmLabel` lets surfaces with a non-destructive verb (e.g.
 * "Discard", "Revoke") swap out the default "Delete" copy without
 * needing a separate component.
 */
export function ConfirmDeleteDialog({
  title,
  description,
  onConfirm,
  triggerLabel,
  trigger,
  confirmLabel = "Delete",
}: {
  title: string;
  description: string;
  onConfirm: () => void;
  triggerLabel?: string;
  trigger?: ReactNode;
  confirmLabel?: string;
}) {
  const triggerNode =
    trigger ?? (
      <Button variant="ghost" className="text-[#8b4c4c] hover:bg-[#fff4f4]">
        {triggerLabel}
      </Button>
    );

  return (
    <AlertDialog.Root>
      <AlertDialog.Trigger asChild>{triggerNode}</AlertDialog.Trigger>
      <AlertDialog.Portal>
        <AlertDialog.Overlay className="fixed inset-0 z-40 bg-[rgba(18,24,32,0.45)] backdrop-blur-sm data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0" />
        <AlertDialog.Content className="fixed left-1/2 top-1/2 z-50 w-[min(92vw,28rem)] -translate-x-1/2 -translate-y-1/2 rounded-[2rem] border border-white/50 bg-[color:var(--background)] p-6 shadow-[0_24px_70px_rgba(18,24,32,0.24)] data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-95">
          <AlertDialog.Title className="font-serif text-2xl text-[color:var(--ink)]">
            {title}
          </AlertDialog.Title>
          <AlertDialog.Description className="mt-3 text-sm leading-7 text-[color:var(--ink-soft)]">
            {description}
          </AlertDialog.Description>
          <div className="mt-6 flex justify-end gap-3">
            <AlertDialog.Cancel asChild>
              <Button variant="secondary">Cancel</Button>
            </AlertDialog.Cancel>
            <AlertDialog.Action asChild>
              <Button variant="danger" onClick={onConfirm}>
                {confirmLabel}
              </Button>
            </AlertDialog.Action>
          </div>
        </AlertDialog.Content>
      </AlertDialog.Portal>
    </AlertDialog.Root>
  );
}
