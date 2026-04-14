"use client";

import Link from "next/link";
import { AppShell } from "@/components/app-shell";
import { DeleteAccountDialog } from "@/components/delete-account-dialog";
import { StorageCleanupDialog } from "@/components/storage-cleanup-dialog";
import { WorkspaceTopbar } from "@/components/workspace-topbar";
import { Button } from "@/components/ui/button";
import { useMemoraStore } from "@/hooks/use-memora-store";
import { getMembershipPlan } from "@/lib/plans";
import { createSupabaseBrowserClient } from "@/lib/supabase/browser";

export default function WorkspaceSettingsPage() {
  const { onboarding, signOut } = useMemoraStore();
  const plan = getMembershipPlan(onboarding.selectedPlanId);
  const signOutNow = () => {
    const supabase = createSupabaseBrowserClient();
    void supabase.auth.signOut().finally(() => {
      signOut();
      window.location.replace("/");
    });
  };

  return (
    <AppShell>
      <WorkspaceTopbar
        eyebrow="Settings"
        title="Settings"
        subtitle="Manage your account, membership, and support actions."
      />

      <section className="grid gap-4 md:grid-cols-2">
        <section className="rounded-2xl bg-white/75 p-5">
          <p className="text-[10px] uppercase tracking-[0.24em] text-[color:var(--ink-faint)]">Account info</p>
          <p className="mt-2 text-sm text-[color:var(--ink)]">{onboarding.user?.email ?? "No signed-in user"}</p>
        </section>

        <section className="rounded-2xl bg-white/75 p-5">
          <p className="text-[10px] uppercase tracking-[0.24em] text-[color:var(--ink-faint)]">Membership</p>
          <p className="mt-2 text-sm text-[color:var(--ink)]">{plan?.name ?? "No plan selected"}</p>
          <p className="mt-1 text-xs text-[color:var(--ink-soft)]">
            {plan ? `${plan.galleryCount} active galleries` : "Pick a plan to unlock capacity"}
          </p>
          <Button asChild variant="secondary" className="mt-4">
            <Link href="/pricing">Upgrade membership</Link>
          </Button>
        </section>

        <section className="rounded-2xl bg-white/75 p-5 md:col-span-2">
          <p className="text-[10px] uppercase tracking-[0.24em] text-[color:var(--ink-faint)]">Maintenance</p>
          <p className="mt-2 text-sm text-[color:var(--ink-soft)]">
            Remove orphaned uploaded files that are no longer referenced by your archive.
          </p>
          <div className="mt-3 max-w-sm">
            <StorageCleanupDialog />
          </div>
        </section>

        <section className="rounded-2xl bg-white/75 p-5 md:col-span-2">
          <p className="text-[10px] uppercase tracking-[0.24em] text-[color:var(--ink-faint)]">Session</p>
          <div className="mt-3">
            <Button type="button" variant="danger" onClick={signOutNow}>
              Sign out
            </Button>
          </div>
        </section>

        <section className="rounded-2xl border border-[#e6c7c7] bg-[#fff9f9] p-5 md:col-span-2">
          <p className="text-[10px] uppercase tracking-[0.24em] text-[#9a4545]">Danger zone</p>
          <p className="mt-2 text-sm text-[#9a4545]">
            Permanently delete your account and all associated Memora data.
          </p>
          <div className="mt-3 max-w-sm">
            <DeleteAccountDialog />
          </div>
        </section>
      </section>
    </AppShell>
  );
}

