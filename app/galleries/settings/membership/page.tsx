import { AppShell } from "@/components/app-shell";
import { BillingStatusCard } from "@/components/membership/billing-status-card";
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

      {/*
        Status summary at the top — current plan, renewal/active-until,
        cancel-at-period-end, internal-account messaging — followed by
        the recurring plan row and the standalone Lifetime section.
      */}
      <div className="mx-auto mb-8 w-full max-w-3xl md:mb-10">
        <BillingStatusCard />
      </div>

      <MembershipPlansPanel />
    </AppShell>
  );
}
