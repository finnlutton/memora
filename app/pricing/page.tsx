"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { AppShell } from "@/components/app-shell";
import { PricingCard } from "@/components/onboarding/pricing-card";
import { useMemoraStore } from "@/hooks/use-memora-store";
import { membershipPlans } from "@/lib/plans";

export default function PricingPage() {
  const router = useRouter();
  const { onboarding, completeCheckout } = useMemoraStore();
  const [busyPlanId, setBusyPlanId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const submitLockRef = useRef(false);

  const orderedPlans = ["free", "lite", "plus", "pro"]
    .map((id) => membershipPlans.find((p) => p.id === id))
    .filter((p): p is (typeof membershipPlans)[number] => Boolean(p));

  return (
    <AppShell>
      <section className="space-y-6 py-4 md:space-y-8 md:py-6">
        <div className="max-w-3xl space-y-3 md:space-y-4">
          <p className="text-[11px] uppercase tracking-[0.32em] text-[color:var(--ink-faint)]">
            Membership
          </p>
          <h1 className="font-serif text-3xl leading-tight text-[color:var(--ink)] md:text-5xl">
            Choose a plan to start building your archive.
          </h1>
          <p className="max-w-2xl text-sm leading-6 text-[color:var(--ink-soft)] md:leading-7">
            Save and organize your memories with the plan that fits how you collect.
          </p>
          <p className="text-sm leading-6 text-[color:var(--ink-soft)] md:leading-7">
            Upgrade anytime as your archive grows.
          </p>
        </div>
        <div className="grid items-stretch gap-3 sm:grid-cols-2 md:gap-5 xl:grid-cols-4">
          {orderedPlans.map((plan) => (
            <PricingCard
              key={plan.id}
              plan={plan}
              isCurrent={onboarding.onboardingComplete && onboarding.selectedPlanId === plan.id}
              buttonLabel={
                onboarding.onboardingComplete && onboarding.selectedPlanId === plan.id
                  ? "Current plan"
                  : busyPlanId === plan.id
                    ? "Saving plan..."
                  : plan.id === "free"
                    ? "Start Free"
                    : "Choose Plan"
              }
              isBusy={busyPlanId === plan.id}
              onSelect={async (selectedPlan) => {
                console.info("Memora: pricing card selected", {
                  planId: selectedPlan.id,
                  busyPlanId,
                  submitLocked: submitLockRef.current,
                });

                if (busyPlanId || submitLockRef.current) {
                  return;
                }

                submitLockRef.current = true;

                setError(null);

                if (!onboarding.isAuthenticated || !onboarding.user?.id) {
                  setError("Please log in again before choosing a plan.");
                  router.push("/auth?redirect=/pricing");
                  submitLockRef.current = false;
                  return;
                }

                if (onboarding.onboardingComplete && onboarding.selectedPlanId === selectedPlan.id) {
                  router.push("/galleries");
                  submitLockRef.current = false;
                  return;
                }

                setBusyPlanId(selectedPlan.id);
                try {
                  await completeCheckout(selectedPlan.id);
                  console.info("Memora: pricing navigation to dashboard", {
                    planId: selectedPlan.id,
                    target: "/galleries",
                  });
                  router.replace("/galleries");
                } catch (checkoutError) {
                  console.error("Memora: pricing plan selection failed", {
                    planId: selectedPlan.id,
                    error: checkoutError,
                  });
                  setError(
                    checkoutError instanceof Error
                      ? checkoutError.message
                      : "We couldn't save your selected plan. Please try again.",
                  );
                } finally {
                  setBusyPlanId(null);
                  submitLockRef.current = false;
                }
              }}
            />
          ))}
        </div>
        {error ? (
          <p className="max-w-2xl rounded-sm border border-[#c98282] bg-[#fff7f7] px-3 py-2 text-sm leading-6 text-[#9a4545]">
            {error}
          </p>
        ) : null}
      </section>
    </AppShell>
  );
}
