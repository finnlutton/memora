"use client";

import * as AlertDialog from "@radix-ui/react-alert-dialog";
import { useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { useMemoraStore } from "@/hooks/use-memora-store";

export function StorageCleanupDialog({ onAfterAction }: { onAfterAction?: () => void }) {
  const { scanOrphanedStorageObjects, deleteOrphanedStorageObjects } = useMemoraStore();
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<{
    totalObjects: number;
    referencedObjects: number;
    orphanedObjects: string[];
  } | null>(null);
  const [deletedCount, setDeletedCount] = useState<number | null>(null);

  const orphanPreview = useMemo(() => {
    const list = result?.orphanedObjects ?? [];
    return {
      count: list.length,
      preview: list.slice(0, 8),
      remaining: Math.max(0, list.length - 8),
    };
  }, [result]);

  return (
    <AlertDialog.Root
      open={open}
      onOpenChange={(next) => {
        setOpen(next);
        if (!next) {
          setBusy(false);
          setError(null);
          setResult(null);
          setDeletedCount(null);
          onAfterAction?.();
        }
      }}
    >
      <AlertDialog.Trigger asChild>
        <button
          type="button"
          className="mt-3 w-full border border-[color:var(--border)] px-3 py-2 text-left text-[11px] uppercase tracking-[0.18em] text-[color:var(--ink)] transition hover:bg-[color:var(--paper)]"
        >
          Cleanup storage
        </button>
      </AlertDialog.Trigger>
      <AlertDialog.Portal>
        <AlertDialog.Overlay className="fixed inset-0 z-40 bg-[rgba(18,24,32,0.45)] backdrop-blur-sm" />
        <AlertDialog.Content className="fixed left-1/2 top-1/2 z-50 w-[min(92vw,34rem)] -translate-x-1/2 -translate-y-1/2 rounded-[2rem] border border-white/50 bg-[color:var(--background)] p-6 shadow-[0_24px_70px_rgba(18,24,32,0.24)]">
          <AlertDialog.Title className="font-serif text-2xl text-[color:var(--ink)]">
            Cleanup orphaned images
          </AlertDialog.Title>
          <AlertDialog.Description className="mt-3 text-sm leading-7 text-[color:var(--ink-soft)]">
            This scans your private <span className="text-[color:var(--ink)]">gallery-images</span> bucket for files
            under your user folder that are <span className="text-[color:var(--ink)]">not referenced</span> by any
            gallery, subgallery, or photo record. It won&apos;t touch anything outside your namespace.
          </AlertDialog.Description>

          {error ? (
            <p className="mt-4 rounded-sm border border-[#c98282] bg-[#fff7f7] px-3 py-2 text-sm leading-6 text-[#9a4545]">
              {error}
            </p>
          ) : null}

          {result ? (
            <div className="mt-5 space-y-3 rounded-[1.25rem] border border-[color:var(--border)] bg-white/70 p-4 text-sm text-[color:var(--ink-soft)]">
              <p>
                Found <span className="text-[color:var(--ink)]">{result.totalObjects}</span> stored objects.{" "}
                <span className="text-[color:var(--ink)]">{result.referencedObjects}</span> are referenced by your
                database.{" "}
                <span className="text-[color:var(--ink)]">{orphanPreview.count}</span> appear orphaned.
              </p>
              {orphanPreview.count ? (
                <div className="rounded-[1rem] border border-[color:var(--border)] bg-[color:var(--paper)] p-3">
                  <p className="text-[10px] uppercase tracking-[0.22em] text-[color:var(--ink-faint)]">
                    Preview
                  </p>
                  <ul className="mt-2 space-y-1 break-all text-xs">
                    {orphanPreview.preview.map((path) => (
                      <li key={path}>{path}</li>
                    ))}
                  </ul>
                  {orphanPreview.remaining ? (
                    <p className="mt-2 text-xs text-[color:var(--ink-faint)]">
                      + {orphanPreview.remaining} more
                    </p>
                  ) : null}
                </div>
              ) : null}
              {deletedCount != null ? (
                <p className="text-xs text-[color:var(--ink-faint)]">
                  Deleted {deletedCount} orphaned object{deletedCount === 1 ? "" : "s"}.
                </p>
              ) : null}
            </div>
          ) : null}

          <div className="mt-6 flex flex-wrap justify-end gap-3">
            <AlertDialog.Cancel asChild>
              <Button variant="secondary" disabled={busy}>
                Close
              </Button>
            </AlertDialog.Cancel>
            <Button
              type="button"
              variant="secondary"
              disabled={busy}
              onClick={async () => {
                setBusy(true);
                setError(null);
                setDeletedCount(null);
                try {
                  const next = await scanOrphanedStorageObjects();
                  setResult(next);
                } catch (err) {
                  setError(err instanceof Error ? err.message : "Failed to scan storage.");
                } finally {
                  setBusy(false);
                }
              }}
            >
              {busy ? "Scanning…" : "Scan"}
            </Button>
            <AlertDialog.Action asChild>
              <Button
                variant="danger"
                disabled={busy || !result || result.orphanedObjects.length === 0}
                onClick={async () => {
                  if (!result) return;
                  setBusy(true);
                  setError(null);
                  try {
                    const res = await deleteOrphanedStorageObjects(result.orphanedObjects);
                    setDeletedCount(res.deleted);
                    setResult((current) =>
                      current
                        ? { ...current, totalObjects: current.totalObjects - res.deleted, orphanedObjects: [] }
                        : current,
                    );
                  } catch (err) {
                    setError(err instanceof Error ? err.message : "Failed to delete orphaned objects.");
                  } finally {
                    setBusy(false);
                  }
                }}
              >
                Delete orphaned files
              </Button>
            </AlertDialog.Action>
          </div>
        </AlertDialog.Content>
      </AlertDialog.Portal>
    </AlertDialog.Root>
  );
}

