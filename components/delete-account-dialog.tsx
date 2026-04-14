"use client";

import * as AlertDialog from "@radix-ui/react-alert-dialog";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { createSupabaseBrowserClient } from "@/lib/supabase/browser";
import { useMemoraStore } from "@/hooks/use-memora-store";

export function DeleteAccountDialog({
  onAfterDelete,
  triggerLabel = "Delete Account",
  triggerClassName,
}: {
  onAfterDelete?: () => void;
  triggerLabel?: string;
  triggerClassName?: string;
}) {
  const { signOut } = useMemoraStore();
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleDelete = async () => {
    setBusy(true);
    setError(null);

    try {
      const response = await fetch("/api/account/delete", {
        method: "DELETE",
      });

      const payload = (await response.json().catch(() => null)) as { error?: string } | null;
      if (!response.ok) {
        throw new Error(payload?.error ?? "Unable to delete your account right now.");
      }

      const supabase = createSupabaseBrowserClient();
      await supabase.auth.signOut();
      signOut();
      onAfterDelete?.();
      window.location.replace("/");
    } catch (deleteError) {
      setError(
        deleteError instanceof Error
          ? deleteError.message
          : "Unable to delete your account right now.",
      );
    } finally {
      setBusy(false);
    }
  };

  return (
    <AlertDialog.Root open={open} onOpenChange={setOpen}>
      <AlertDialog.Trigger asChild>
        <button
          type="button"
          className={
            triggerClassName ??
            "mt-6 w-full border border-[#c98282] bg-[#fff7f7] px-3 py-2 text-[11px] uppercase tracking-[0.18em] text-[#9a4545] transition hover:bg-[#ffefef]"
          }
        >
          {triggerLabel}
        </button>
      </AlertDialog.Trigger>
      <AlertDialog.Portal>
        <AlertDialog.Overlay className="fixed inset-0 z-40 bg-[rgba(18,24,32,0.45)] backdrop-blur-sm" />
        <AlertDialog.Content className="fixed left-1/2 top-1/2 z-50 w-[min(92vw,30rem)] -translate-x-1/2 -translate-y-1/2 rounded-[2rem] border border-white/50 bg-[color:var(--background)] p-6 shadow-[0_24px_70px_rgba(18,24,32,0.24)]">
          <AlertDialog.Title className="font-serif text-2xl text-[color:var(--ink)]">
            Delete account?
          </AlertDialog.Title>
          <AlertDialog.Description className="mt-3 space-y-2 text-sm leading-7 text-[color:var(--ink-soft)]">
            <p>
              This will permanently delete your account, galleries, uploaded photos, and all
              associated data.
            </p>
            <p>This action cannot be undone.</p>
          </AlertDialog.Description>
          {error ? (
            <p className="mt-4 rounded-sm border border-[#c98282] bg-[#fff7f7] px-3 py-2 text-sm leading-6 text-[#9a4545]">
              {error}
            </p>
          ) : null}
          <div className="mt-6 flex justify-end gap-3">
            <AlertDialog.Cancel asChild>
              <Button variant="secondary" disabled={busy}>
                Cancel
              </Button>
            </AlertDialog.Cancel>
            <Button variant="danger" onClick={() => void handleDelete()} disabled={busy}>
              {busy ? "Deleting account..." : "Delete Account"}
            </Button>
          </div>
        </AlertDialog.Content>
      </AlertDialog.Portal>
    </AlertDialog.Root>
  );
}
