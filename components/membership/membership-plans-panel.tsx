"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { PricingCard } from "@/components/onboarding/pricing-card";
import { useMemoraStore } from "@/hooks/use-memora-store";
import { isPaidPlan, publicMembershipPlans } from "@/lib/plans";

const PLAN_DISPLAY_ORDER: Array<"free" | "plus" | "max" | "lifetime"> = [
  "free",
  "plus",
  "max",
  "lifetime",
];

export function MembershipPlansPanel() {
  const router = useRouter();
  const { onboarding, completeCheckout } = useMemoraStore();
  const [busyPlanId, setBusyPlanId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const submitLockRef = useRef(false);

  const orderedPlans = PLAN_DISPLAY_ORDER
    .map((id) => publicMembershipPlans.find((plan) => plan.id === id))
    .filter((plan): plan is (typeof publicMembershipPlans)[number] => Boolean(plan));

  return (
    <section className="mx-auto w-full max-w-5xl space-y-5">
      <div className="grid items-stretch gap-3 sm:grid-cols-2 xl:grid-cols-4">
        {orderedPlans.map((plan) => (
          <PricingCard
            key={plan.id}
            plan={plan}
            isCurrent={
              onboarding.onboardingComplete &&
              onboarding.selectedPlanId === plan.id
            }
            buttonLabel={
              onboarding.onboardingComplete &&
              onboarding.selectedPlanId === plan.id
                ? "Current plan"
                : busyPlanId === plan.id
                  ? plan.id === "free"
                    ? "Saving plan..."
                    : "Redirecting…"
                  : plan.id === "free"
                    ? "Start Free"
                    : "Choose Plan"
            }
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

              if (
                onboarding.onboardingComplete &&
                onboarding.selectedPlanId === selectedPlan.id
              ) {
                router.push("/galleries");
                submitLockRef.current = false;
                return;
              }

              setBusyPlanId(selectedPlan.id);
              try {
                if (isPaidPlan(selectedPlan.id)) {
                  // Paid plans go through Stripe Checkout. The server
                  // resolves the price from env vars; we only send the
                  // planId.
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
                      data.error ?? "Could not start checkout. Please try again.",
                    );
                  }
                  window.location.href = data.url;
                  return;
                }

                // Free plan: keep the existing local-write flow.
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
