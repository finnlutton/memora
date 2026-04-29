import { AppShell } from "@/components/app-shell";
import { MembershipPlansPanel } from "@/components/membership/membership-plans-panel";
import { WorkspaceTopbar } from "@/components/workspace-topbar";

export default function MembershipPage() {
  return (
    <AppShell>
      <WorkspaceTopbar
        eyebrow="Account Info"
        title="Membership"
        subtitle="Choose the plan that fits how you keep memories. Switch anytime."
      />

      <MembershipPlansPanel />
    </AppShell>
  );
}
