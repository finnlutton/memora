import { AppShell } from "@/components/app-shell";
import { BillingStatusCard } from "@/components/membership/billing-status-card";
import { MembershipPlansPanel } from "@/components/membership/membership-plans-panel";
import { WorkspaceTopbar } from "@/components/workspace-topbar";

export default function MembershipPage() {
  return (
    <AppShell>
      <WorkspaceTopbar
        eyebrow="Settings"
        title="Membership"
        subtitle="Review your current plan and upgrade as your memory library grows."
      />
      <div className="mx-auto mb-6 w-full max-w-2xl">
        <BillingStatusCard />
      </div>
      <MembershipPlansPanel />
    </AppShell>
  );
}
