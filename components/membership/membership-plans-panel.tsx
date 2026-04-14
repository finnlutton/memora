"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { PricingCard } from "@/components/onboarding/pricing-card";
import { useMemoraStore } from "@/hooks/use-memora-store";
import { membershipPlans } from "@/lib/plans";

export function MembershipPlansPanel() {
  const router = useRouter();
  const { onboarding, completeCheckout } = useMemoraStore();
  const [busyPlanId, setBusyPlanId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const submitLockRef = useRef(false);

  const orderedPlans = ["free", "lite", "plus", "pro"]
    .map((id) => membershipPlans.find((plan) => plan.id === id))
    .filter((plan): plan is (typeof membershipPlans)[number] => Boolean(plan));

  return (
    <section className="mx-auto w-full max-w-5xl space-y-5">
      <div className="grid items-stretch gap-3 sm:grid-cols-2 xl:grid-cols-4">
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
              if (busyPlanId || submitLockRef.current) {
                return;
              }

              submitLockRef.current = true;
              setError(null);

              if (!onboarding.isAuthenticated || !onboarding.user?.id) {
                setError("Please log in again before choosing a plan.");
                router.push("/auth?redirect=/galleries/settings/membership");
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
                router.replace("/galleries");
              } catch (checkoutError) {
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
  );
}
