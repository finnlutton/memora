"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { AppShell } from "@/components/app-shell";
import { PricingCard } from "@/components/onboarding/pricing-card";
import { useMemoraStore } from "@/hooks/use-memora-store";
import { membershipPlans } from "@/lib/plans";

export default function PricingPage() {
  const router = useRouter();
  const { hydrated, onboarding, selectPlan } = useMemoraStore();

  useEffect(() => {
    if (!hydrated) {
      return;
    }
    if (!onboarding.isAuthenticated) {
      router.replace("/auth");
      return;
    }
    if (onboarding.onboardingComplete) {
      router.replace("/galleries/new");
      return;
    }
  }, [
    hydrated,
    onboarding.isAuthenticated,
    onboarding.onboardingComplete,
    router,
  ]);

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
            Each plan determines how many galleries you can actively maintain each year.
          </p>
        </div>
        <div className="grid gap-5 xl:grid-cols-3">
          {membershipPlans.map((plan) => (
            <PricingCard
              key={plan.id}
              plan={plan}
              onSelect={(selectedPlan) => {
                selectPlan(selectedPlan.id);
                router.push("/checkout");
              }}
            />
          ))}
        </div>
      </section>
    </AppShell>
  );
}
