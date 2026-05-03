"use client";

import { Trash2, X } from "lucide-react";
import { useEffect, useRef } from "react";
import { Button } from "@/components/ui/button";
import { useMemoraStore } from "@/hooks/use-memora-store";

export function StorageQuotaBanner() {
  const { storageQuotaExceeded, dismissStorageQuotaWarning, clearLocalCache } =
    useMemoraStore();
  const bannerRef = useRef<HTMLDivElement | null>(null);

  // Publish the banner's effective height (including safe-area) so other
  // floating elements (FAB, share floating bar, recovery pill, toasts)
  // can sit above it via `bottom: calc(var(--memora-bottom-banner)+...)`.
  // Cleared on unmount so the floating elements snap back to their
  // normal bottom offsets.
  useEffect(() => {
    if (!storageQuotaExceeded) return;
    const root = document.documentElement;
    const apply = () => {
      const h = bannerRef.current?.offsetHeight ?? 0;
      root.style.setProperty("--memora-bottom-banner", `${h}px`);
    };
    apply();
    const ro =
      typeof ResizeObserver !== "undefined"
        ? new ResizeObserver(apply)
        : null;
    if (ro && bannerRef.current) ro.observe(bannerRef.current);
    return () => {
      ro?.disconnect();
      root.style.removeProperty("--memora-bottom-banner");
    };
  }, [storageQuotaExceeded]);

  if (!storageQuotaExceeded) return null;

  return (
    <div
      ref={bannerRef}
      role="alert"
      style={{
        paddingBottom: "calc(env(safe-area-inset-bottom, 0px) + 0.75rem)",
      }}
      className="fixed bottom-0 left-0 right-0 z-[100] border-t border-[color:var(--border-strong)] bg-[color:var(--paper-strong)] px-4 pt-3 text-center shadow-[0_-8px_32px_rgba(22,35,56,0.12)] md:pt-3.5"
    >
      <div className="mx-auto flex max-w-3xl flex-col items-center gap-3 sm:flex-row sm:justify-center sm:gap-6">
        <p className="text-sm leading-6 text-[color:var(--ink)]">
          Browser storage is full. New changes may not be saved. Use{" "}
          <strong>Clear local cache</strong> to free space — your saved photos
          on Memora are unaffected. Uploaded images are now resized
          automatically to use less space.
        </p>
        {/*
          Cluster the actions: Clear local cache (primary, calls
          clearLocalCache which also sets storageQuotaExceeded back to
          false so the banner self-dismisses) and Dismiss (secondary,
          just hides the banner without changing storage). Both shrink-0
          so they don't get crushed at narrow widths.
        */}
        <div className="flex shrink-0 items-center gap-2">
          <Button
            type="button"
            className="shrink-0"
            onClick={clearLocalCache}
            aria-label="Clear local Memora cache"
          >
            <Trash2 className="h-3.5 w-3.5" />
            Clear local cache
          </Button>
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
    </div>
  );
}
