"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { AppShell } from "@/components/app-shell";
import { CheckoutSummary } from "@/components/onboarding/checkout-summary";
import { PaymentForm } from "@/components/onboarding/payment-form";
import { useMemoraStore } from "@/hooks/use-memora-store";
import { getMembershipPlan } from "@/lib/plans";

export default function CheckoutPage() {
  const router = useRouter();
  const { hydrated, onboarding } = useMemoraStore();
  const plan = getMembershipPlan(onboarding.selectedPlanId);

  useEffect(() => {
    if (!hydrated) {
      return;
    }
    if (!onboarding.isAuthenticated) {
      router.replace("/auth");
      return;
    }
    if (!plan) {
      router.replace("/pricing");
      return;
    }
    if (onboarding.onboardingComplete) {
      router.replace("/galleries/new");
    }
  }, [hydrated, onboarding.isAuthenticated, onboarding.onboardingComplete, plan, router]);

  if (!plan) {
    return null;
  }

  return (
    <AppShell>
      <section className="grid gap-6 py-6 xl:grid-cols-[0.72fr_1.28fr]">
        <CheckoutSummary plan={plan} />
        <PaymentForm plan={plan} />
      </section>
    </AppShell>
  );
}
