"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { AppShell } from "@/components/app-shell";
import { CheckoutSummary } from "@/components/onboarding/checkout-summary";
import { PaymentForm } from "@/components/onboarding/payment-form";
import { useMemoraStore } from "@/hooks/use-memora-store";
import { getMembershipPlan, type MembershipPlanId } from "@/lib/plans";

export default function CheckoutPage() {
  const router = useRouter();
  const { hydrated, onboarding } = useMemoraStore();
  const [normalizedPlanId, setNormalizedPlanId] = useState<MembershipPlanId | null>(null);
  const plan = getMembershipPlan(normalizedPlanId);

  useEffect(() => {
    if (typeof window === "undefined") {
      return;
    }

    const requestedPlanId = new URLSearchParams(window.location.search).get("plan");
    const nextPlanId =
      requestedPlanId && getMembershipPlan(requestedPlanId as MembershipPlanId)
        ? (requestedPlanId as MembershipPlanId)
        : null;

    queueMicrotask(() => {
      setNormalizedPlanId(nextPlanId);
    });
  }, []);

  useEffect(() => {
    if (!hydrated) {
      return;
    }
    if (!plan) {
      router.replace("/pricing");
      return;
    }
  }, [hydrated, plan, router]);

  if (!hydrated || !onboarding.isAuthenticated || !plan) {
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
