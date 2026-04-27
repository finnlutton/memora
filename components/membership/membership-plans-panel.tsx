"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { PricingCard } from "@/components/onboarding/pricing-card";
import { useBillingStatus } from "@/hooks/use-billing-status";
import { useMemoraStore } from "@/hooks/use-memora-store";
import {
  isPaidPlan,
  publicMembershipPlans,
  type MembershipPlanId,
} from "@/lib/plans";

const PLAN_DISPLAY_ORDER: MembershipPlanId[] = ["free", "plus", "max", "lifetime"];

// Tier ranking for upgrade/downgrade detection. Higher number = more
// access. Lifetime ranks above max because it's a permanent equivalent.
const PLAN_RANK: Record<MembershipPlanId, number> = {
  free: 0,
  plus: 1,
  max: 2,
  lifetime: 3,
  internal: 4,
};

function formatDate(iso: string | null) {
  if (!iso) return null;
  try {
    return new Date(iso).toLocaleDateString("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
    });
  } catch {
    return null;
  }
}

export function MembershipPlansPanel() {
  const router = useRouter();
  const { onboarding, completeCheckout } = useMemoraStore();
  const { status: billing } = useBillingStatus();
  const [busyPlanId, setBusyPlanId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const submitLockRef = useRef(false);

  const orderedPlans = PLAN_DISPLAY_ORDER
    .map((id) => publicMembershipPlans.find((plan) => plan.id === id))
    .filter((plan): plan is (typeof publicMembershipPlans)[number] => Boolean(plan));

  // Resolve the user's effective plan from the billing endpoint when
  // available; fall back to the local onboarding state during the
  // brief window before /api/billing/status responds.
  const effectivePlanId = (billing?.planId ??
    (onboarding.selectedPlanId as MembershipPlanId | null) ??
    "free") as MembershipPlanId;
  const cancelAtPeriodEnd = Boolean(billing?.cancelAtPeriodEnd);
  const renewDate = formatDate(billing?.currentPeriodEnd ?? null);

  const labelFor = (planId: MembershipPlanId, busy: boolean) => {
    if (busy) {
      return planId === "free" ? "Saving plan..." : "Redirecting…";
    }
    if (planId === effectivePlanId) {
      return "Current plan";
    }
    if (planId === "free") {
      return "Start Free";
    }
    if (PLAN_RANK[planId] > PLAN_RANK[effectivePlanId]) {
      return "Upgrade";
    }
    return "Choose Plan";
  };

  return (
    <section className="mx-auto w-full max-w-5xl space-y-5">
      {/* Cancel-at-period-end note for paid users */}
      {effectivePlanId !== "free" && cancelAtPeriodEnd && renewDate ? (
        <p className="max-w-2xl border border-[color:var(--border)] bg-white px-3 py-2 text-[12.5px] leading-5 text-[color:var(--ink-soft)]">
          Active until {renewDate}; manage billing to renew or change.
        </p>
      ) : null}

      <div className="grid items-stretch gap-3 sm:grid-cols-2 xl:grid-cols-4">
        {orderedPlans.map((plan) => {
          const isCurrent = plan.id === effectivePlanId;
          return (
            <PricingCard
              key={plan.id}
              plan={plan}
              isCurrent={isCurrent}
              buttonLabel={labelFor(plan.id, busyPlanId === plan.id)}
              isBusy={busyPlanId === plan.id}
              onSelect={async (selectedPlan) => {
                if (busyPlanId || submitLockRef.current) return;
                submitLockRef.current = true;
                setError(null);

                if (!onboarding.isAuthenticated || !onboarding.user?.id) {
                  setError("Please log in again before choosing a plan.");
                  router.push("/auth?redirect=/galleries/settings/membership");
                  submitLockRef.current = false;
                  return;
                }

                if (selectedPlan.id === effectivePlanId) {
                  router.push("/galleries");
                  submitLockRef.current = false;
                  return;
                }

                setBusyPlanId(selectedPlan.id);
                try {
                  if (isPaidPlan(selectedPlan.id)) {
                    const response = await fetch(
                      "/api/stripe/create-checkout-session",
                      {
                        method: "POST",
                        headers: { "Content-Type": "application/json" },
                        body: JSON.stringify({ planId: selectedPlan.id }),
                      },
                    );
                    const data = (await response.json()) as {
                      url?: string;
                      error?: string;
                    };
                    if (!response.ok || !data.url) {
                      throw new Error(
                        data.error ??
                          "Could not start checkout. Please try again.",
                      );
                    }
                    window.location.href = data.url;
                    return;
                  }
                  await completeCheckout(selectedPlan.id);
                  router.replace("/galleries");
                } catch (checkoutError) {
                  setError(
                    checkoutError instanceof Error
                      ? checkoutError.message
                      : "We couldn't process that plan change. Please try again.",
                  );
                } finally {
                  setBusyPlanId(null);
                  submitLockRef.current = false;
                }
              }}
            />
          );
        })}
      </div>

      {error ? (
        <p className="max-w-2xl rounded-sm border border-[#c98282] bg-[#fff7f7] px-3 py-2 text-sm leading-6 text-[#9a4545]">
          {error}
        </p>
      ) : null}
    </section>
  );
}
