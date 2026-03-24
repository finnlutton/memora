"use client";

import { X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useMemoraStore } from "@/hooks/use-memora-store";

export function StorageQuotaBanner() {
  const { storageQuotaExceeded, dismissStorageQuotaWarning } = useMemoraStore();
  if (!storageQuotaExceeded) return null;

  return (
    <div
      role="alert"
      className="fixed bottom-0 left-0 right-0 z-[100] border-t border-[color:var(--border-strong)] bg-[color:var(--paper-strong)] px-4 py-3 text-center shadow-[0_-8px_32px_rgba(22,35,56,0.12)] md:py-3.5"
    >
      <div className="mx-auto flex max-w-3xl flex-col items-center gap-3 sm:flex-row sm:justify-center sm:gap-6">
        <p className="text-sm leading-6 text-[color:var(--ink)]">
          Browser storage is full. New changes may not be saved. Delete galleries or use smaller photos, then try{" "}
          <strong>Reset demo</strong> on My galleries if you need a clean slate. Uploaded images are now resized
          automatically to use less space.
        </p>
        <Button
          type="button"
          variant="secondary"
          className="shrink-0"
          onClick={dismissStorageQuotaWarning}
          aria-label="Dismiss storage warning"
        >
          <X className="h-3.5 w-3.5" />
          Dismiss
        </Button>
      </div>
    </div>
  );
}
