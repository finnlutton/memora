"use client";

import { useRouter } from "next/navigation";
import { AppShell } from "@/components/app-shell";
import { PricingCard } from "@/components/onboarding/pricing-card";
import { useMemoraStore } from "@/hooks/use-memora-store";
import { membershipPlans } from "@/lib/plans";

export default function PricingPage() {
  const router = useRouter();
  const { onboarding, completeCheckout } = useMemoraStore();

  const orderedPlans = ["free", "lite", "plus", "pro"]
    .map((id) => membershipPlans.find((p) => p.id === id))
    .filter((p): p is (typeof membershipPlans)[number] => Boolean(p));

  return (
    <AppShell>
      <section className="space-y-8 py-6">
        <div className="max-w-3xl space-y-4">
          <p className="text-[11px] uppercase tracking-[0.32em] text-[color:var(--ink-faint)]">
            Membership
          </p>
          <h1 className="font-serif text-5xl leading-tight text-[color:var(--ink)]">
            Choose a plan to start building your archive.
          </h1>
          <p className="max-w-2xl text-sm leading-7 text-[color:var(--ink-soft)]">
            Save and organize your memories with the plan that fits how you collect.
          </p>
          <p className="text-sm leading-7 text-[color:var(--ink-soft)]">
            Upgrade anytime as your archive grows.
          </p>
        </div>
        <div className="grid items-stretch gap-5 sm:grid-cols-2 xl:grid-cols-4">
          {orderedPlans.map((plan) => (
            <PricingCard
              key={plan.id}
              plan={plan}
              isCurrent={onboarding.onboardingComplete && onboarding.selectedPlanId === plan.id}
              buttonLabel={
                onboarding.onboardingComplete && onboarding.selectedPlanId === plan.id
                  ? "Current plan"
                  : plan.id === "free"
                    ? "Start Free"
                    : "Select Plan"
              }
              onSelect={(selectedPlan) => {
                if (onboarding.onboardingComplete && onboarding.selectedPlanId === selectedPlan.id) {
                  router.push("/galleries");
                  return;
                }

                if (selectedPlan.id === "free") {
                  void completeCheckout(selectedPlan.id).then(() => {
                    router.push("/galleries");
                  });
                  return;
                }

                router.push(`/checkout?plan=${selectedPlan.id}`);
              }}
            />
          ))}
        </div>
      </section>
    </AppShell>
  );
}
