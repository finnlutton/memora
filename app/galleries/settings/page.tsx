"use client";

import * as AlertDialog from "@radix-ui/react-alert-dialog";
import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { AlertTriangle } from "lucide-react";
import { AppearancePicker } from "@/components/appearance-picker";
import { AppShell } from "@/components/app-shell";
import { DeleteAccountDialog } from "@/components/delete-account-dialog";
import { WorkspaceTopbar } from "@/components/workspace-topbar";
import { BillingStatusCard } from "@/components/membership/billing-status-card";
import { LegalLinks } from "@/components/legal-links";
import { Button } from "@/components/ui/button";
import { useMemoraStore } from "@/hooks/use-memora-store";

export default function WorkspaceSettingsPage() {
  const { onboarding } = useMemoraStore();

  return (
    <AppShell>
      <WorkspaceTopbar
        title="Account Info"
        subtitle="Manage your account, membership, and support actions."
      />

      {/*
        Appearance — three curated themes. Sits above account/membership
        because it's the setting most likely to be changed on first visit,
        and because a palette change reframes every subsequent section.
      */}
      <section
        aria-labelledby="settings-appearance-heading"
        className="mx-auto mb-6 w-full max-w-5xl border-b border-[color:var(--border)] pb-6"
      >
        <div className="mb-4">
          <p
            id="settings-appearance-heading"
            className="text-[10px] font-medium uppercase tracking-[0.24em] text-[color:var(--ink)]"
          >
            Appearance
          </p>
          <p className="mt-2 max-w-xl text-sm text-[color:var(--ink-soft)]">
            Choose the palette your archive is dressed in. Applies immediately, only to your account.
          </p>
        </div>
        <AppearancePicker />
      </section>

      <section className="mx-auto grid w-full max-w-5xl gap-5 md:grid-cols-2 md:gap-x-8 md:gap-y-6">
        <section className="border-b border-[color:var(--border)] pb-4 md:col-start-1 md:row-start-1">
          <p className="text-[10px] font-medium uppercase tracking-[0.24em] text-[color:var(--ink)]">Account</p>
          <p className="mt-2 text-sm text-[color:var(--ink-soft)]">
            {onboarding.user?.email ?? "No signed-in user"}
          </p>
        </section>

        <section className="border-b border-[color:var(--border)] pb-4 md:col-start-2 md:row-start-1">
          <p className="flex items-center gap-1.5 text-[10px] font-medium uppercase tracking-[0.24em] text-[color:var(--ink)]">
            <span>Sharing safety</span>
            <AlertTriangle className="h-3 w-3 text-[#b05b5b]" />
          </p>
          <p className="mt-2 text-sm text-[color:var(--ink-soft)]">
            Disable every previously created public share link in one step.
          </p>
          <div className="mt-3 max-w-sm">
            <RevokeAllSharesDialog />
          </div>
        </section>

        <section className="border-b border-[color:var(--border)] pb-4 md:col-start-1 md:row-start-2">
          <p className="text-[10px] font-medium uppercase tracking-[0.24em] text-[color:var(--ink)]">
            Membership
          </p>
          <div className="mt-3 space-y-3">
            <BillingStatusCard />
            <Button
              asChild
              variant="ghost"
              className="px-0 text-[11px] tracking-[0.16em]"
            >
              <Link href="/galleries/settings/membership">
                Compare plans →
              </Link>
            </Button>
          </div>
        </section>

        <section className="border-b border-[color:var(--border)] pb-4 md:col-start-2 md:row-start-2">
          <p className="flex items-center gap-1.5 text-[10px] font-medium uppercase tracking-[0.24em] text-[color:var(--ink)]">
            <span>Delete account</span>
            <AlertTriangle className="h-3 w-3 text-[#b05b5b]" />
          </p>
          <p className="mt-2 text-sm text-[color:var(--ink-soft)]">
            Permanently delete your account and all associated Memora data.
          </p>
          <div className="mt-3 max-w-sm">
            <DeleteAccountDialog
              triggerClassName="w-full border border-[color:var(--border)] px-3 py-2 text-left text-[11px] uppercase tracking-[0.18em] text-[color:var(--ink)] transition hover:bg-[color:var(--paper)]"
            />
          </div>
        </section>

        {/*
          Local cache reset — same recovery action exposed by the
          'Browser storage is full' banner, surfaced here so a user who
          dismissed the banner can still find it. Sits below the
          dangerous account actions because it's mild by comparison:
          nothing on Supabase is touched, only the local browser cache.
        */}
        <section className="border-b border-[color:var(--border)] pb-4 md:col-start-1 md:row-start-3">
          <p className="text-[10px] font-medium uppercase tracking-[0.24em] text-[color:var(--ink)]">
            Local cache
          </p>
          <p className="mt-2 text-sm text-[color:var(--ink-soft)]">
            Clears Memora&apos;s browser cache and re-seeds the demo
            galleries. Your saved photos and account data are unaffected.
            Useful if the app feels sluggish or if you&apos;ve seen a
            &ldquo;Browser storage is full&rdquo; warning.
          </p>
          <div className="mt-3 max-w-sm">
            <ClearLocalCacheButton />
          </div>
        </section>
      </section>

      {/* Legal footer — quiet, sits below the settings grid. */}
      <footer className="mt-10 border-t border-[color:var(--border)] pt-5 md:mt-14">
        <LegalLinks />
      </footer>
    </AppShell>
  );
}

/**
 * Settings-side surface for the same `clearLocalCache` action exposed
 * on the storage-quota banner. Single-click — no confirmation dialog
 * — because the action is genuinely safe: it only touches the local
 * browser cache (USER_STORAGE_KEY, DEMO_STORAGE_KEY, LEGACY_STORAGE_KEY)
 * and re-seeds the demo galleries. A short transient message
 * confirms the action; auto-clears after ~2.5s.
 */
function ClearLocalCacheButton() {
  const { clearLocalCache } = useMemoraStore();
  const [confirmation, setConfirmation] = useState<string | null>(null);
  const timerRef = useRef<number | null>(null);

  useEffect(() => {
    return () => {
      if (timerRef.current !== null) {
        window.clearTimeout(timerRef.current);
      }
    };
  }, []);

  const handleClick = () => {
    clearLocalCache();
    setConfirmation("Local cache cleared.");
    if (timerRef.current !== null) {
      window.clearTimeout(timerRef.current);
    }
    timerRef.current = window.setTimeout(() => {
      setConfirmation(null);
      timerRef.current = null;
    }, 2_500);
  };

  return (
    <>
      <button
        type="button"
        onClick={handleClick}
        title="Clear Memora's local browser cache (does not affect your saved photos)."
        className="w-full border border-[color:var(--border)] px-3 py-2 text-left text-[11px] uppercase tracking-[0.18em] text-[color:var(--ink)] transition hover:bg-[color:var(--paper)]"
      >
        Clear local cache
      </button>
      {confirmation ? (
        <p
          role="status"
          aria-live="polite"
          className="mt-2 text-xs leading-5 text-[color:var(--ink-soft)]"
        >
          {confirmation}
        </p>
      ) : null}
    </>
  );
}

function RevokeAllSharesDialog() {
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  return (
    <AlertDialog.Root open={open} onOpenChange={setOpen}>
      <AlertDialog.Trigger asChild>
        <button
          type="button"
          title="Disable every previously created public share link."
          className="w-full border border-[color:var(--border)] px-3 py-2 text-left text-[11px] uppercase tracking-[0.18em] text-[color:var(--ink)] transition hover:bg-[color:var(--paper)]"
        >
          Revoke all shared links
        </button>
      </AlertDialog.Trigger>
      <AlertDialog.Portal>
        <AlertDialog.Overlay className="fixed inset-0 z-40 bg-[rgba(18,24,32,0.45)] backdrop-blur-sm" />
        <AlertDialog.Content className="fixed left-1/2 top-1/2 z-50 w-[min(92vw,32rem)] -translate-x-1/2 -translate-y-1/2 rounded-[2rem] border border-white/50 bg-[color:var(--background)] p-6 shadow-[0_24px_70px_rgba(18,24,32,0.24)]">
          <AlertDialog.Title className="font-serif text-2xl text-[color:var(--ink)]">
            Are you sure you want to do this?
          </AlertDialog.Title>
          <AlertDialog.Description className="mt-3 text-sm leading-7 text-[color:var(--ink-soft)]">
            This cannot be undone.
          </AlertDialog.Description>
          <p className="mt-1 text-sm leading-7 text-[color:var(--ink-soft)]">
            This will disable all share links you&apos;ve created so far.
          </p>
          <p className="text-sm leading-7 text-[color:var(--ink-soft)]">
            Anyone opening an old shared link will no longer be able to view those galleries.
          </p>
          {error ? (
            <p className="mt-4 rounded-sm border border-[#c98282] bg-[#fff7f7] px-3 py-2 text-sm leading-6 text-[#9a4545]">
              {error}
            </p>
          ) : null}
          {success ? (
            <p className="mt-4 rounded-sm border border-[rgba(46,78,114,0.16)] bg-[rgba(246,250,255,0.9)] px-3 py-2 text-sm leading-6 text-[color:var(--ink)]">
              {success}
            </p>
          ) : null}
          <div className="mt-6 flex justify-end gap-3">
            <AlertDialog.Cancel asChild>
              <Button variant="secondary" disabled={busy}>
                Go back
              </Button>
            </AlertDialog.Cancel>
            <Button
              type="button"
              variant="danger"
              disabled={busy}
              onClick={async () => {
                setBusy(true);
                setError(null);
                setSuccess(null);
                try {
                  const response = await fetch("/api/shares/revoke-all", { method: "POST" });
                  const payload = (await response.json()) as { error?: string; revokedCount?: number };
                  if (!response.ok) {
                    throw new Error(payload.error ?? "Unable to revoke shared links right now.");
                  }
                  setSuccess(
                    payload.revokedCount && payload.revokedCount > 0
                      ? `All past share links have been revoked (${payload.revokedCount}).`
                      : "All past share links have been revoked.",
                  );
                } catch (revokeError) {
                  setError(
                    revokeError instanceof Error
                      ? revokeError.message
                      : "Unable to revoke shared links right now.",
                  );
                } finally {
                  setBusy(false);
                }
              }}
            >
              {busy ? "Yes..." : "Yes"}
            </Button>
          </div>
        </AlertDialog.Content>
      </AlertDialog.Portal>
    </AlertDialog.Root>
  );
}

