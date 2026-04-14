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

  return (
    <AppShell>
      <WorkspaceTopbar
        eyebrow="Settings"
        title="Workspace Settings"
        subtitle="Account and plan controls are tucked away here to keep your creation space calm."
      />

      <section className="grid gap-4 md:grid-cols-2">
        <div className="rounded-2xl bg-white/75 p-5">
          <p className="text-[10px] uppercase tracking-[0.24em] text-[color:var(--ink-faint)]">Account</p>
          <p className="mt-2 text-sm text-[color:var(--ink)]">{onboarding.user?.email ?? "No signed-in user"}</p>
        </div>
        <div className="rounded-2xl bg-white/75 p-5">
          <p className="text-[10px] uppercase tracking-[0.24em] text-[color:var(--ink-faint)]">Membership</p>
          <p className="mt-2 text-sm text-[color:var(--ink)]">{plan?.name ?? "No plan selected"}</p>
          <Button asChild variant="secondary" className="mt-4">
            <Link href="/pricing">Manage plan</Link>
          </Button>
        </div>
        <div className="rounded-2xl bg-white/75 p-5 md:col-span-2">
          <p className="text-[10px] uppercase tracking-[0.24em] text-[color:var(--ink-faint)]">Account actions</p>
          <div className="mt-4 flex flex-wrap gap-3">
            <StorageCleanupDialog />
            <Button
              type="button"
              variant="danger"
              onClick={() => {
                const supabase = createSupabaseBrowserClient();
                void supabase.auth.signOut().finally(() => {
                  signOut();
                  window.location.replace("/");
                });
              }}
            >
              Sign out
            </Button>
          </div>
          <div className="mt-4">
            <DeleteAccountDialog />
          </div>
        </div>
      </section>
    </AppShell>
  );
}

