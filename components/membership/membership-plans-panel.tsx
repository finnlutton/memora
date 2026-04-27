"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { LifetimeSection } from "@/components/membership/lifetime-section";
import { RecurringPlanCard } from "@/components/membership/recurring-plan-card";
import { useBillingStatus } from "@/hooks/use-billing-status";
import { useMemoraStore } from "@/hooks/use-memora-store";
import {
  isPaidPlan,
  publicMembershipPlans,
  type MembershipPlan,
  type MembershipPlanId,
} from "@/lib/plans";

/**
 * Membership / pricing panel.
 *
 * Layout:
 *   1. Optional cancel-at-period-end notice
 *   2. Three recurring plans in a row (Free, Plus, Max)
 *   3. Lifetime as a separate, horizontally-laid feature section
 *
 * Driven entirely by the centralized plan config + the billing status
 * endpoint. All payment + Stripe logic from the previous version is
 * preserved — only the layout, copy, and visual treatment changed.
 */

const RECURRING_ORDER: MembershipPlanId[] = ["free", "plus", "max"];

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

  const recurringPlans = RECURRING_ORDER
    .map((id) => publicMembershipPlans.find((plan) => plan.id === id))
    .filter((plan): plan is MembershipPlan => Boolean(plan));
  const lifetimePlan = publicMembershipPlans.find((p) => p.id === "lifetime");

  // Use billing endpoint when available; fall back to local onboarding
  // state during the brief window before /api/billing/status responds.
  const effectivePlanId = (billing?.planId ??
    (onboarding.selectedPlanId as MembershipPlanId | null) ??
    "free") as MembershipPlanId;
  const cancelAtPeriodEnd = Boolean(billing?.cancelAtPeriodEnd);
  const renewDate = formatDate(billing?.currentPeriodEnd ?? null);

  const labelFor = (planId: MembershipPlanId, busy: boolean) => {
    if (busy) return planId === "free" ? "Saving…" : "Redirecting…";
    if (planId === effectivePlanId) return "Current plan";
    if (planId === "free") return "Switch to Free";
    if (PLAN_RANK[planId] > PLAN_RANK[effectivePlanId]) return "Upgrade";
    return "Choose plan";
  };

  const lifetimeLabel = (busy: boolean) => {
    if (busy) return "Redirecting…";
    if (effectivePlanId === "lifetime") return "Current plan";
    return "Get Lifetime";
  };

  const handleSelect = async (selectedPlan: MembershipPlan) => {
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
            data.error ?? "Could not start checkout. Please try again.",
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
  };

  return (
    <section className="mx-auto w-full max-w-5xl space-y-6">
      {/* Cancel-at-period-end note for paid users */}
      {effectivePlanId !== "free" && cancelAtPeriodEnd && renewDate ? (
        <p className="border border-[color:var(--border)] bg-white px-4 py-3 text-[12.5px] leading-5 text-[color:var(--ink-soft)]">
          Your plan is active until{" "}
          <span className="text-[color:var(--ink)]">{renewDate}</span> and
          will not renew. Manage billing to keep it.
        </p>
      ) : null}

      {/* ── Recurring plan row ────────────────────────────────────────── */}
      <div className="grid items-stretch gap-4 md:grid-cols-3 md:gap-5">
        {recurringPlans.map((plan) => (
          <RecurringPlanCard
            key={plan.id}
            plan={plan}
            isCurrent={plan.id === effectivePlanId}
            isBusy={busyPlanId === plan.id}
            buttonLabel={labelFor(plan.id, busyPlanId === plan.id)}
            onSelect={handleSelect}
          />
        ))}
      </div>

      {/* ── Lifetime — separate horizontal feature section ───────────── */}
      {lifetimePlan ? (
        <LifetimeSection
          isCurrent={effectivePlanId === "lifetime"}
          isBusy={busyPlanId === "lifetime"}
          buttonLabel={lifetimeLabel(busyPlanId === "lifetime")}
          effectivePlanId={effectivePlanId}
          onSelect={() => handleSelect(lifetimePlan)}
        />
      ) : null}

      {error ? (
        <p className="border border-[#c98282] bg-[#fff7f7] px-3 py-2 text-[13px] leading-6 text-[#9a4545]">
          {error}
        </p>
      ) : null}
    </section>
  );
}
