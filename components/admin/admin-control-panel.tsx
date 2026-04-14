"use client";

import * as AlertDialog from "@radix-ui/react-alert-dialog";
import { useMemo, useState } from "react";
import { Button } from "@/components/ui/button";

type ScanResult = {
  totalObjects: number;
  referencedObjects: number;
  orphanedObjects: string[];
};

export function AdminControlPanel() {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<ScanResult | null>(null);
  const [deletedCount, setDeletedCount] = useState<number | null>(null);
  const [confirmOpen, setConfirmOpen] = useState(false);

  const preview = useMemo(() => {
    const list = result?.orphanedObjects ?? [];
    return {
      count: list.length,
      sample: list.slice(0, 12),
      remaining: Math.max(0, list.length - 12),
    };
  }, [result]);

  return (
    <div className="mx-auto w-full max-w-5xl space-y-6">
      <section className="grid gap-5 md:grid-cols-2">
        <section className="border-b border-[rgba(34,52,79,0.08)] pb-4">
          <p className="text-[10px] font-semibold uppercase tracking-[0.24em] text-[color:var(--ink)]">Data Health</p>
          <p className="mt-2 text-sm text-[color:var(--ink-soft)]">
            Scan storage for uploads that no longer map to galleries, subgalleries, or photos.
          </p>
          <div className="mt-3 flex flex-wrap gap-2">
            <Button
              type="button"
              variant="secondary"
              disabled={busy}
              onClick={async () => {
                setBusy(true);
                setError(null);
                setDeletedCount(null);
                try {
                  const response = await fetch("/api/admin/orphaned-uploads/scan", { method: "GET" });
                  const payload = (await response.json()) as { error?: string } & Partial<ScanResult>;
                  if (!response.ok) throw new Error(payload.error ?? "Unable to scan orphaned uploads.");
                  setResult({
                    totalObjects: payload.totalObjects ?? 0,
                    referencedObjects: payload.referencedObjects ?? 0,
                    orphanedObjects: payload.orphanedObjects ?? [],
                  });
                } catch (scanError) {
                  setError(scanError instanceof Error ? scanError.message : "Unable to scan orphaned uploads.");
                } finally {
                  setBusy(false);
                }
              }}
            >
              {busy ? "Scanning..." : "Scan orphaned uploads"}
            </Button>
            <AlertDialog.Root open={confirmOpen} onOpenChange={setConfirmOpen}>
              <AlertDialog.Trigger asChild>
                <Button
                  type="button"
                  variant="danger"
                  disabled={busy || !result || result.orphanedObjects.length === 0}
                >
                  Cleanup orphaned uploads
                </Button>
              </AlertDialog.Trigger>
              <AlertDialog.Portal>
                <AlertDialog.Overlay className="fixed inset-0 z-40 bg-[rgba(18,24,32,0.45)] backdrop-blur-sm" />
                <AlertDialog.Content className="fixed left-1/2 top-1/2 z-50 w-[min(92vw,32rem)] -translate-x-1/2 -translate-y-1/2 rounded-[2rem] border border-white/50 bg-[color:var(--background)] p-6 shadow-[0_24px_70px_rgba(18,24,32,0.24)]">
                  <AlertDialog.Title className="font-serif text-2xl text-[color:var(--ink)]">
                    Confirm cleanup?
                  </AlertDialog.Title>
                  <AlertDialog.Description className="mt-3 text-sm leading-7 text-[color:var(--ink-soft)]">
                    This will permanently delete detected orphaned uploads from storage.
                  </AlertDialog.Description>
                  <div className="mt-6 flex justify-end gap-3">
                    <AlertDialog.Cancel asChild>
                      <Button variant="secondary">Go back</Button>
                    </AlertDialog.Cancel>
                    <Button
                      type="button"
                      variant="danger"
                      onClick={async () => {
                        if (!result) return;
                        setBusy(true);
                        setError(null);
                        try {
                          const response = await fetch("/api/admin/orphaned-uploads/cleanup", {
                            method: "POST",
                            headers: { "Content-Type": "application/json" },
                            body: JSON.stringify({ paths: result.orphanedObjects }),
                          });
                          const payload = (await response.json()) as { error?: string; deleted?: number };
                          if (!response.ok) throw new Error(payload.error ?? "Unable to clean orphaned uploads.");
                          setDeletedCount(payload.deleted ?? 0);
                          setResult((current) =>
                            current
                              ? {
                                  ...current,
                                  totalObjects: Math.max(0, current.totalObjects - (payload.deleted ?? 0)),
                                  orphanedObjects: [],
                                }
                              : current,
                          );
                          setConfirmOpen(false);
                        } catch (cleanupError) {
                          setError(
                            cleanupError instanceof Error
                              ? cleanupError.message
                              : "Unable to clean orphaned uploads.",
                          );
                        } finally {
                          setBusy(false);
                        }
                      }}
                    >
                      Yes, clean now
                    </Button>
                  </div>
                </AlertDialog.Content>
              </AlertDialog.Portal>
            </AlertDialog.Root>
          </div>
        </section>

        <section className="border-b border-[rgba(34,52,79,0.08)] pb-4">
          <p className="text-[10px] font-semibold uppercase tracking-[0.24em] text-[color:var(--ink)]">Sharing</p>
          <p className="mt-2 text-sm text-[color:var(--ink-soft)]">
            Reserved for advanced share-link controls and audit tools.
          </p>
        </section>

        <section className="border-b border-[rgba(34,52,79,0.08)] pb-4">
          <p className="text-[10px] font-semibold uppercase tracking-[0.24em] text-[color:var(--ink)]">Users</p>
          <p className="mt-2 text-sm text-[color:var(--ink-soft)]">
            Reserved for user diagnostics and account-level operator actions.
          </p>
        </section>

        <section className="border-b border-[rgba(34,52,79,0.08)] pb-4">
          <p className="text-[10px] font-semibold uppercase tracking-[0.24em] text-[color:var(--ink)]">Support / Operations</p>
          <p className="mt-2 text-sm text-[color:var(--ink-soft)]">
            Reserved for incoming issue triage, incident notes, and support workflows.
          </p>
        </section>
      </section>

      {error ? (
        <p className="rounded-sm border border-[#c98282] bg-[#fff7f7] px-3 py-2 text-sm leading-6 text-[#9a4545]">
          {error}
        </p>
      ) : null}

      {result ? (
        <section className="space-y-3 rounded-[1.25rem] border border-[color:var(--border)] bg-white/72 p-4 text-sm text-[color:var(--ink-soft)]">
          <p>
            Found <span className="text-[color:var(--ink)]">{result.totalObjects}</span> objects in storage, with{" "}
            <span className="text-[color:var(--ink)]">{result.referencedObjects}</span> referenced by archive records.
            Orphaned detected: <span className="text-[color:var(--ink)]">{preview.count}</span>.
          </p>
          {preview.sample.length ? (
            <div className="rounded-[1rem] border border-[color:var(--border)] bg-[color:var(--paper)] p-3">
              <p className="text-[10px] uppercase tracking-[0.22em] text-[color:var(--ink-faint)]">Orphaned preview</p>
              <ul className="mt-2 space-y-1 break-all text-xs">
                {preview.sample.map((path) => (
                  <li key={path}>{path}</li>
                ))}
              </ul>
              {preview.remaining ? (
                <p className="mt-2 text-xs text-[color:var(--ink-faint)]">+ {preview.remaining} more</p>
              ) : null}
            </div>
          ) : null}
          {deletedCount != null ? (
            <p className="text-xs text-[color:var(--ink-faint)]">
              Deleted {deletedCount} orphaned upload{deletedCount === 1 ? "" : "s"}.
            </p>
          ) : null}
        </section>
      ) : null}
    </div>
  );
}
