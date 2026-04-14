import { AppShell } from "@/components/app-shell";
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
      <MembershipPlansPanel />
    </AppShell>
  );
}
