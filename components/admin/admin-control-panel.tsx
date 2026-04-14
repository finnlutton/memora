"use client";

import * as AlertDialog from "@radix-ui/react-alert-dialog";
import { useMemo, useState } from "react";
import { Button } from "@/components/ui/button";

type ScanResult = {
  totalObjects: number;
  referencedObjects: number;
  orphanedObjects: string[];
};

type UserLookupResult = {
  found: boolean;
  user?: {
    id: string;
    email: string;
    createdAt: string | null;
    selectedPlan: string | null;
  };
  archive?: {
    galleries: number;
    subgalleries: number;
    photos: number;
  };
  sharing?: {
    totalShares: number;
    activeShares: number;
    revokedShares: number;
    latestShareCreatedAt: string | null;
  };
  recentActivity?: {
    latestGalleryUpdatedAt: string | null;
    latestGalleryTitle: string | null;
  };
  recentGalleries?: Array<{ title: string; updatedAt: string }>;
};

type ShareDiagnosticsResult = {
  foundUser?: boolean;
  filterEmail?: string;
  filterUserEmail?: string;
  metrics: {
    totalShares: number;
    activeShares: number;
    revokedShares: number;
    totalMappings: number;
    averageGalleriesPerShare: number;
  };
  recentShares: Array<{
    id: string;
    createdAt: string;
    status: "active" | "revoked";
    messagePreview: string;
    ownerEmail: string;
    galleryCount: number;
    tokenPreview: string;
  }>;
};

type IntegrityScanResult = {
  generatedAt: string;
  summary: {
    totalChecks: number;
    checksWithIssues: number;
    totalIssueCount: number;
    healthy: boolean;
  };
  checks: Array<{
    key: string;
    name: string;
    description: string;
    count: number;
    samples: Array<Record<string, string | null>>;
  }>;
};

function formatDateTime(value: string | null) {
  if (!value) return "—";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
  }).format(date);
}

export function AdminControlPanel() {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<ScanResult | null>(null);
  const [deletedCount, setDeletedCount] = useState<number | null>(null);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [lookupBusy, setLookupBusy] = useState(false);
  const [lookupEmail, setLookupEmail] = useState("");
  const [lookupError, setLookupError] = useState<string | null>(null);
  const [lookupResult, setLookupResult] = useState<UserLookupResult | null>(null);
  const [shareBusy, setShareBusy] = useState(false);
  const [shareError, setShareError] = useState<string | null>(null);
  const [shareEmailFilter, setShareEmailFilter] = useState("");
  const [shareResult, setShareResult] = useState<ShareDiagnosticsResult | null>(null);
  const [shareRevokeBusy, setShareRevokeBusy] = useState(false);
  const [shareRevokeSuccess, setShareRevokeSuccess] = useState<string | null>(null);
  const [revokeConfirmOpen, setRevokeConfirmOpen] = useState(false);
  const [integrityBusy, setIntegrityBusy] = useState(false);
  const [integrityError, setIntegrityError] = useState<string | null>(null);
  const [integrityResult, setIntegrityResult] = useState<IntegrityScanResult | null>(null);

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
      <section className="space-y-5">
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
          <p className="text-[10px] font-semibold uppercase tracking-[0.24em] text-[color:var(--ink)]">Data Integrity</p>
          <p className="mt-2 text-sm text-[color:var(--ink-soft)]">
            Scan relational integrity across galleries, subgalleries, photos, shares, and profiles.
          </p>
          <div className="mt-3">
            <Button
              type="button"
              variant="secondary"
              disabled={integrityBusy}
              onClick={async () => {
                setIntegrityBusy(true);
                setIntegrityError(null);
                try {
                  const response = await fetch("/api/admin/integrity/scan", { method: "GET" });
                  const payload = (await response.json()) as IntegrityScanResult & { error?: string };
                  if (!response.ok) {
                    throw new Error(payload.error ?? "Unable to run integrity scan.");
                  }
                  setIntegrityResult(payload);
                } catch (scanError) {
                  setIntegrityError(
                    scanError instanceof Error ? scanError.message : "Unable to run integrity scan.",
                  );
                } finally {
                  setIntegrityBusy(false);
                }
              }}
            >
              {integrityBusy ? "Scanning..." : "Run Integrity Scan"}
            </Button>
          </div>
        </section>

        <section className="border-b border-[rgba(34,52,79,0.08)] pb-4">
          <p className="text-[10px] font-semibold uppercase tracking-[0.24em] text-[color:var(--ink)]">Share Diagnostics</p>
          <p className="mt-2 text-sm text-[color:var(--ink-soft)]">
            Inspect share totals, status split, and recent share records.
          </p>
          <div className="mt-3 flex flex-wrap items-center gap-2">
            <input
              type="email"
              value={shareEmailFilter}
              onChange={(event) => setShareEmailFilter(event.target.value)}
              placeholder="Optional owner email filter"
              className="min-w-0 flex-1 border border-[color:var(--border)] bg-white/80 px-3 py-2 text-sm text-[color:var(--ink)] outline-none transition focus:border-[color:var(--accent)]"
            />
            <Button
              type="button"
              variant="secondary"
              disabled={shareBusy}
              onClick={async () => {
                setShareBusy(true);
                setShareError(null);
                setShareRevokeSuccess(null);
                try {
                  const response = await fetch("/api/admin/shares/diagnostics", {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({ email: shareEmailFilter.trim() || undefined }),
                  });
                  const payload = (await response.json()) as ShareDiagnosticsResult & { error?: string };
                  if (!response.ok) throw new Error(payload.error ?? "Unable to load share diagnostics.");
                  setShareResult(payload);
                } catch (diagnosticsError) {
                  setShareError(
                    diagnosticsError instanceof Error
                      ? diagnosticsError.message
                      : "Unable to load share diagnostics.",
                  );
                } finally {
                  setShareBusy(false);
                }
              }}
            >
              {shareBusy ? "Loading..." : "Load diagnostics"}
            </Button>
          </div>
          <div className="mt-3">
            <AlertDialog.Root open={revokeConfirmOpen} onOpenChange={setRevokeConfirmOpen}>
              <AlertDialog.Trigger asChild>
                <Button
                  type="button"
                  variant="danger"
                  disabled={
                    shareRevokeBusy ||
                    !shareResult ||
                    !shareResult.foundUser ||
                    !shareResult.filterUserEmail
                  }
                >
                  Revoke all shares for this user
                </Button>
              </AlertDialog.Trigger>
              <AlertDialog.Portal>
                <AlertDialog.Overlay className="fixed inset-0 z-40 bg-[rgba(18,24,32,0.45)] backdrop-blur-sm" />
                <AlertDialog.Content className="fixed left-1/2 top-1/2 z-50 w-[min(92vw,32rem)] -translate-x-1/2 -translate-y-1/2 rounded-[2rem] border border-white/50 bg-[color:var(--background)] p-6 shadow-[0_24px_70px_rgba(18,24,32,0.24)]">
                  <AlertDialog.Title className="font-serif text-2xl text-[color:var(--ink)]">
                    Revoke shares for filtered user?
                  </AlertDialog.Title>
                  <AlertDialog.Description className="mt-3 text-sm leading-7 text-[color:var(--ink-soft)]">
                    This will revoke all currently active shares for {shareResult?.filterUserEmail ?? "this user"}.
                  </AlertDialog.Description>
                  <div className="mt-6 flex justify-end gap-3">
                    <AlertDialog.Cancel asChild>
                      <Button variant="secondary">Go back</Button>
                    </AlertDialog.Cancel>
                    <Button
                      type="button"
                      variant="danger"
                      disabled={shareRevokeBusy}
                      onClick={async () => {
                        if (!shareResult?.filterUserEmail) return;
                        setShareRevokeBusy(true);
                        setShareError(null);
                        setShareRevokeSuccess(null);
                        try {
                          const response = await fetch("/api/admin/shares/revoke-user", {
                            method: "POST",
                            headers: { "Content-Type": "application/json" },
                            body: JSON.stringify({ email: shareResult.filterUserEmail }),
                          });
                          const payload = (await response.json()) as {
                            error?: string;
                            revokedCount?: number;
                            userEmail?: string;
                          };
                          if (!response.ok) {
                            throw new Error(payload.error ?? "Unable to revoke shares for user.");
                          }
                          setShareRevokeSuccess(
                            `Revoked ${payload.revokedCount ?? 0} active share link${
                              payload.revokedCount === 1 ? "" : "s"
                            } for ${payload.userEmail ?? shareResult.filterUserEmail}.`,
                          );
                          setRevokeConfirmOpen(false);
                        } catch (revokeError) {
                          setShareError(
                            revokeError instanceof Error
                              ? revokeError.message
                              : "Unable to revoke shares for user.",
                          );
                        } finally {
                          setShareRevokeBusy(false);
                        }
                      }}
                    >
                      {shareRevokeBusy ? "Revoking..." : "Yes, revoke"}
                    </Button>
                  </div>
                </AlertDialog.Content>
              </AlertDialog.Portal>
            </AlertDialog.Root>
          </div>
        </section>

        <section className="border-b border-[rgba(34,52,79,0.08)] pb-4">
          <p className="text-[10px] font-semibold uppercase tracking-[0.24em] text-[color:var(--ink)]">User Lookup</p>
          <p className="mt-2 text-sm text-[color:var(--ink-soft)]">
            Search by exact email for a compact account, usage, and sharing summary.
          </p>
          <div className="mt-3 flex flex-wrap items-center gap-2">
            <input
              type="email"
              value={lookupEmail}
              onChange={(event) => setLookupEmail(event.target.value)}
              placeholder="user@example.com"
              className="min-w-0 flex-1 border border-[color:var(--border)] bg-white/80 px-3 py-2 text-sm text-[color:var(--ink)] outline-none transition focus:border-[color:var(--accent)]"
            />
            <Button
              type="button"
              variant="secondary"
              disabled={lookupBusy || lookupEmail.trim().length === 0}
              onClick={async () => {
                setLookupBusy(true);
                setLookupError(null);
                setLookupResult(null);
                try {
                  const response = await fetch("/api/admin/users/lookup", {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({ email: lookupEmail.trim() }),
                  });
                  const payload = (await response.json()) as UserLookupResult & { error?: string };
                  if (!response.ok) throw new Error(payload.error ?? "Lookup failed.");
                  setLookupResult(payload);
                } catch (lookupRequestError) {
                  setLookupError(
                    lookupRequestError instanceof Error ? lookupRequestError.message : "Lookup failed.",
                  );
                } finally {
                  setLookupBusy(false);
                }
              }}
            >
              {lookupBusy ? "Searching..." : "Search"}
            </Button>
          </div>
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

      {lookupError ? (
        <p className="rounded-sm border border-[#c98282] bg-[#fff7f7] px-3 py-2 text-sm leading-6 text-[#9a4545]">
          {lookupError}
        </p>
      ) : null}

      {shareError ? (
        <p className="rounded-sm border border-[#c98282] bg-[#fff7f7] px-3 py-2 text-sm leading-6 text-[#9a4545]">
          {shareError}
        </p>
      ) : null}

      {integrityError ? (
        <p className="rounded-sm border border-[#c98282] bg-[#fff7f7] px-3 py-2 text-sm leading-6 text-[#9a4545]">
          {integrityError}
        </p>
      ) : null}

      {shareRevokeSuccess ? (
        <p className="rounded-sm border border-[rgba(46,78,114,0.16)] bg-[rgba(246,250,255,0.9)] px-3 py-2 text-sm leading-6 text-[color:var(--ink)]">
          {shareRevokeSuccess}
        </p>
      ) : null}

      {integrityResult ? (
        <section className="space-y-3 rounded-[1.25rem] border border-[color:var(--border)] bg-white/72 p-4 text-sm text-[color:var(--ink-soft)]">
          <div className="flex flex-wrap items-center gap-x-4 gap-y-1 border-b border-[rgba(34,52,79,0.08)] pb-3">
            <span>
              Checks: <span className="text-[color:var(--ink)]">{integrityResult.summary.totalChecks}</span>
            </span>
            <span>
              With issues: <span className="text-[color:var(--ink)]">{integrityResult.summary.checksWithIssues}</span>
            </span>
            <span>
              Total flagged rows:{" "}
              <span className="text-[color:var(--ink)]">{integrityResult.summary.totalIssueCount}</span>
            </span>
            <span>
              Run at: <span className="text-[color:var(--ink)]">{formatDateTime(integrityResult.generatedAt)}</span>
            </span>
          </div>

          {integrityResult.summary.healthy ? (
            <p className="text-[color:var(--ink)]">No issues found across all integrity checks.</p>
          ) : (
            <ul className="space-y-3">
              {integrityResult.checks.map((check) => (
                <li key={check.key} className="border-b border-[rgba(34,52,79,0.08)] pb-3 last:border-b-0 last:pb-0">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <p className="text-[color:var(--ink)]">{check.name}</p>
                    <span className={check.count > 0 ? "text-[color:var(--ink)]" : "text-[color:var(--ink-faint)]"}>
                      {check.count} flagged
                    </span>
                  </div>
                  <p className="mt-1 text-xs text-[color:var(--ink-faint)]">{check.description}</p>
                  {check.count > 0 && check.samples.length > 0 ? (
                    <ul className="mt-2 space-y-1 text-xs break-all">
                      {check.samples.map((sample, index) => (
                        <li key={`${check.key}-sample-${index}`}>{JSON.stringify(sample)}</li>
                      ))}
                    </ul>
                  ) : null}
                </li>
              ))}
            </ul>
          )}
        </section>
      ) : null}

      {shareResult ? (
        <section className="space-y-3 rounded-[1.25rem] border border-[color:var(--border)] bg-white/72 p-4 text-sm text-[color:var(--ink-soft)]">
          <div className="grid gap-3 md:grid-cols-5">
            <StatChip label="Total shares" value={String(shareResult.metrics.totalShares)} />
            <StatChip label="Active" value={String(shareResult.metrics.activeShares)} />
            <StatChip label="Revoked" value={String(shareResult.metrics.revokedShares)} />
            <StatChip label="Share mappings" value={String(shareResult.metrics.totalMappings)} />
            <StatChip label="Avg galleries/share" value={String(shareResult.metrics.averageGalleriesPerShare)} />
          </div>
          {shareResult.filterEmail && !shareResult.foundUser ? (
            <p>No user found for {shareResult.filterEmail}.</p>
          ) : null}
          {shareResult.recentShares.length ? (
            <div className="overflow-x-auto border-t border-[rgba(34,52,79,0.08)] pt-3">
              <table className="min-w-full text-left text-sm">
                <thead className="text-[10px] uppercase tracking-[0.2em] text-[color:var(--ink-faint)]">
                  <tr>
                    <th className="pb-2 pr-4 font-medium">Created</th>
                    <th className="pb-2 pr-4 font-medium">Owner</th>
                    <th className="pb-2 pr-4 font-medium">Status</th>
                    <th className="pb-2 pr-4 font-medium">Galleries</th>
                    <th className="pb-2 pr-4 font-medium">Token</th>
                    <th className="pb-2 font-medium">Message</th>
                  </tr>
                </thead>
                <tbody>
                  {shareResult.recentShares.map((entry) => (
                    <tr key={entry.id} className="border-t border-[rgba(34,52,79,0.06)]">
                      <td className="py-2 pr-4 whitespace-nowrap">{formatDateTime(entry.createdAt)}</td>
                      <td className="py-2 pr-4 whitespace-nowrap">{entry.ownerEmail}</td>
                      <td className="py-2 pr-4 whitespace-nowrap">
                        <span className={entry.status === "active" ? "text-[color:var(--ink)]" : "text-[color:var(--ink-faint)]"}>
                          {entry.status}
                        </span>
                      </td>
                      <td className="py-2 pr-4 whitespace-nowrap">{entry.galleryCount}</td>
                      <td className="py-2 pr-4 whitespace-nowrap">{entry.tokenPreview}</td>
                      <td className="py-2">{entry.messagePreview || "—"}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <p>No recent shares to display.</p>
          )}
        </section>
      ) : null}

      {lookupResult ? (
        lookupResult.found ? (
          <section className="space-y-3 rounded-[1.25rem] border border-[color:var(--border)] bg-white/72 p-4 text-sm text-[color:var(--ink-soft)]">
            <p className="text-[10px] font-semibold uppercase tracking-[0.22em] text-[color:var(--ink-faint)]">
              Lookup result
            </p>
            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-1">
                <p>
                  <span className="text-[color:var(--ink)]">Email:</span> {lookupResult.user?.email ?? "—"}
                </p>
                <p className="break-all">
                  <span className="text-[color:var(--ink)]">User ID:</span> {lookupResult.user?.id ?? "—"}
                </p>
                <p>
                  <span className="text-[color:var(--ink)]">Created:</span> {formatDateTime(lookupResult.user?.createdAt ?? null)}
                </p>
                <p>
                  <span className="text-[color:var(--ink)]">Plan:</span> {lookupResult.user?.selectedPlan ?? "—"}
                </p>
              </div>
              <div className="space-y-1">
                <p>
                  <span className="text-[color:var(--ink)]">Galleries:</span> {lookupResult.archive?.galleries ?? 0}
                </p>
                <p>
                  <span className="text-[color:var(--ink)]">Subgalleries:</span> {lookupResult.archive?.subgalleries ?? 0}
                </p>
                <p>
                  <span className="text-[color:var(--ink)]">Photos:</span> {lookupResult.archive?.photos ?? 0}
                </p>
                <p>
                  <span className="text-[color:var(--ink)]">Shares:</span> {lookupResult.sharing?.totalShares ?? 0} total (
                  {lookupResult.sharing?.activeShares ?? 0} active / {lookupResult.sharing?.revokedShares ?? 0} revoked)
                </p>
              </div>
            </div>
            <div className="grid gap-4 border-t border-[rgba(34,52,79,0.08)] pt-3 md:grid-cols-2">
              <p>
                <span className="text-[color:var(--ink)]">Latest gallery:</span>{" "}
                {lookupResult.recentActivity?.latestGalleryTitle ?? "—"} (
                {formatDateTime(lookupResult.recentActivity?.latestGalleryUpdatedAt ?? null)})
              </p>
              <p>
                <span className="text-[color:var(--ink)]">Latest share created:</span>{" "}
                {formatDateTime(lookupResult.sharing?.latestShareCreatedAt ?? null)}
              </p>
            </div>
            {lookupResult.recentGalleries?.length ? (
              <div className="border-t border-[rgba(34,52,79,0.08)] pt-3">
                <p className="text-[10px] uppercase tracking-[0.22em] text-[color:var(--ink-faint)]">Recent galleries</p>
                <ul className="mt-2 space-y-1">
                  {lookupResult.recentGalleries.map((entry) => (
                    <li key={`${entry.title}-${entry.updatedAt}`} className="text-sm">
                      <span className="text-[color:var(--ink)]">{entry.title}</span> — {formatDateTime(entry.updatedAt)}
                    </li>
                  ))}
                </ul>
              </div>
            ) : null}
          </section>
        ) : (
          <section className="rounded-[1.25rem] border border-[color:var(--border)] bg-white/72 p-4 text-sm text-[color:var(--ink-soft)]">
            No user found.
          </section>
        )
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

function StatChip({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-[0.9rem] border border-[color:var(--border)] bg-[color:var(--paper)] px-3 py-2">
      <p className="text-[10px] uppercase tracking-[0.18em] text-[color:var(--ink-faint)]">{label}</p>
      <p className="mt-1 text-[15px] text-[color:var(--ink)]">{value}</p>
    </div>
  );
}
