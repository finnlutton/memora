"use client";

import * as AlertDialog from "@radix-ui/react-alert-dialog";
import Link from "next/link";
import { useState } from "react";
import { AlertTriangle } from "lucide-react";
import { AppShell } from "@/components/app-shell";
import { DeleteAccountDialog } from "@/components/delete-account-dialog";
import { WorkspaceTopbar } from "@/components/workspace-topbar";
import { Button } from "@/components/ui/button";
import { useMemoraStore } from "@/hooks/use-memora-store";
import { getMembershipPlan } from "@/lib/plans";

export default function WorkspaceSettingsPage() {
  const { onboarding } = useMemoraStore();
  const plan = getMembershipPlan(onboarding.selectedPlanId);

  return (
    <AppShell>
      <WorkspaceTopbar
        eyebrow="Settings"
        title="Settings"
        subtitle="Manage your account, membership, and support actions."
      />

      <section className="mx-auto grid w-full max-w-5xl gap-5 md:grid-cols-2 md:gap-x-8 md:gap-y-6">
        <section className="border-b border-[rgba(34,52,79,0.08)] pb-4 md:col-start-1 md:row-start-1">
          <p className="text-[10px] font-semibold uppercase tracking-[0.24em] text-[color:var(--ink)]">Account</p>
          <p className="mt-2 text-sm text-[color:var(--ink-soft)]">
            {onboarding.user?.email ?? "No signed-in user"}
          </p>
        </section>

        <section className="border-b border-[rgba(34,52,79,0.08)] pb-4 md:col-start-2 md:row-start-1">
          <p className="flex items-center gap-1.5 text-[10px] font-semibold uppercase tracking-[0.24em] text-[color:var(--ink)]">
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

        <section className="border-b border-[rgba(34,52,79,0.08)] pb-4 md:col-start-1 md:row-start-2">
          <p className="text-[10px] font-semibold uppercase tracking-[0.24em] text-[color:var(--ink)]">Membership</p>
          <p className="mt-2 text-sm text-[color:var(--ink-soft)]">
            {plan ? `${plan.name} plan` : "No plan selected"}
          </p>
          <div className="mt-4">
            <Button
              asChild
              className="bg-[#00A86B] px-3.5 py-2 text-[11px] tracking-[0.16em] hover:bg-[#00925d]"
            >
              <Link href="/pricing">Upgrade membership</Link>
            </Button>
          </div>
        </section>

        <section className="border-b border-[rgba(34,52,79,0.08)] pb-4 md:col-start-2 md:row-start-2">
          <p className="flex items-center gap-1.5 text-[10px] font-semibold uppercase tracking-[0.24em] text-[color:var(--ink)]">
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
      </section>
    </AppShell>
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

