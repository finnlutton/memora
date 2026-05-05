"use client";

import Link from "next/link";
import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { FounderOfferBanner } from "@/components/membership/founder-offer-banner";
import { RecurringPlanCard } from "@/components/membership/recurring-plan-card";
import { useBillingStatus } from "@/hooks/use-billing-status";
import { useMemoraStore } from "@/hooks/use-memora-store";
import {
  getPlan,
  isPaidPlan,
  membershipPlans,
  publicMembershipPlans,
  type MembershipPlan,
  type MembershipPlanId,
} from "@/lib/plans";

/**
 * Membership / pricing panel.
 *
 * Layout:
 *   1. Optional cancel-at-period-end / Abroad-Pass / Max notice
 *   2. Three plan cards in a row: Free, Plus, Abroad Pass
 *   3. Small Founder offer banner (Limited early-adopter pricing) that
 *      reuses the existing Founder checkout/cancel logic
 *
 * Max remains a real backend plan but is hidden from the public picker.
 * Legacy Max users keep their plan; they see a notice that lets them
 * downgrade to Plus or Free if they want.
 *
 * Driven entirely by the centralized plan config + the billing status
 * endpoint. All payment + Stripe logic from the previous version is
 * preserved — only the layout, copy, and visual treatment changed.
 */

const PLAN_PICKER_ORDER: MembershipPlanId[] = ["free", "plus", "abroad_pass"];

const PLAN_RANK: Record<MembershipPlanId, number> = {
  free: 0,
  plus: 1,
  abroad_pass: 2,
  max: 3,
  lifetime: 4,
  internal: 5,
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
  const { status: billing, refetch: refetchBilling } = useBillingStatus();
  const [busyPlanId, setBusyPlanId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [info, setInfo] = useState<string | null>(null);
  const submitLockRef = useRef(false);

  const ACTIVE_SUB_STATUSES = new Set(["active", "trialing", "past_due"]);
  const hasActiveStripeSub = Boolean(
    billing?.subscriptionStatus &&
      ACTIVE_SUB_STATUSES.has(billing.subscriptionStatus) &&
      billing.planId !== "free" &&
      billing.planId !== "lifetime" &&
      billing.planId !== "abroad_pass",
  );

  const pickerPlans = PLAN_PICKER_ORDER
    .map((id) => publicMembershipPlans.find((plan) => plan.id === id))
    .filter((plan): plan is MembershipPlan => Boolean(plan));
  const founderPlan = membershipPlans.find((p) => p.id === "lifetime");

  // Use billing endpoint when available; fall back to local onboarding
  // state during the brief window before /api/billing/status responds.
  const effectivePlanId = (billing?.planId ??
    (onboarding.selectedPlanId as MembershipPlanId | null) ??
    "free") as MembershipPlanId;
  const cancelAtPeriodEnd = Boolean(billing?.cancelAtPeriodEnd);
  const renewDate = formatDate(billing?.currentPeriodEnd ?? null);
  const effectivePlan = getPlan(effectivePlanId);
  const isLegacyMax = effectivePlanId === "max";
  const isAbroadActive = effectivePlanId === "abroad_pass";
  const [billingPortalBusy, setBillingPortalBusy] = useState(false);
  const [billingPortalError, setBillingPortalError] = useState<string | null>(null);

  const openBillingPortal = async () => {
    if (billingPortalBusy) return;
    setBillingPortalBusy(true);
    setBillingPortalError(null);
    try {
      const response = await fetch("/api/stripe/create-portal-session", {
        method: "POST",
      });
      const data = (await response.json()) as {
        url?: string;
        message?: string;
        error?: string;
      };
      if (response.ok && data.url) {
        window.location.href = data.url;
        return;
      }
      setBillingPortalError(
        data.message ?? data.error ?? "Could not open billing portal.",
      );
    } catch {
      setBillingPortalError(
        "Could not reach billing portal. Try again in a moment.",
      );
    } finally {
      setBillingPortalBusy(false);
    }
  };

  const labelFor = (planId: MembershipPlanId, busy: boolean) => {
    if (busy) return planId === "free" ? "Saving…" : "Redirecting…";
    if (planId === effectivePlanId) return "Current plan";
    if (planId === "free") return "Switch to Free";
    if (planId === "plus") return "Upgrade to Plus";
    if (planId === "abroad_pass") return "Get Abroad Pass";
    if (PLAN_RANK[planId] > PLAN_RANK[effectivePlanId]) return "Upgrade";
    return "Choose plan";
  };

  const founderLabel = (busy: boolean) => {
    if (busy) return "Redirecting…";
    if (effectivePlanId === "lifetime") return "Current plan";
    return "View Founder offer";
  };

  const handleSelect = async (selectedPlan: MembershipPlan) => {
    if (busyPlanId || submitLockRef.current) return;
    submitLockRef.current = true;
    setError(null);
    setInfo(null);

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
      // Existing Stripe subscriber → route through change-plan so we
      // proration-update in place (Plus↔Max), schedule cancel-at-period-end
      // (→ Free), or cancel + redirect to one-time Checkout (→ Founder).
      // Never create a parallel subscription.
      if (hasActiveStripeSub) {
        const response = await fetch("/api/stripe/change-plan", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ planId: selectedPlan.id }),
        });
        const data = (await response.json()) as {
          ok?: boolean;
          url?: string;
          message?: string;
          error?: string;
          redirect?: string;
        };

        if (response.ok) {
          if (data.url) {
            // Founder upgrade — go finish the one-time payment.
            window.location.href = data.url;
            return;
          }
          // In-place update or scheduled cancellation.
          await refetchBilling();
          setInfo(data.message ?? "Plan updated.");
          return;
        }

        // Stale local state can leave hasActiveStripeSub=true while the
        // server has no live sub. In that case, fall through to checkout.
        if (response.status === 409 && data.redirect === "checkout") {
          // fall through to the checkout branch below
        } else {
          throw new Error(
            data.error ?? "Could not change your plan. Please try again.",
          );
        }
      }

      // No active sub (or change-plan asked us to redirect) → standard
      // Checkout flow for Plus / Max / Founder.
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
          redirect?: string;
        };
        if (!response.ok || !data.url) {
          throw new Error(
            data.error ?? "Could not start checkout. Please try again.",
          );
        }
        window.location.href = data.url;
        return;
      }

      // Free plan, no active sub → just write locally.
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
      {/* Thin status notice for paid users in cancel-at-period-end. */}
      {effectivePlanId !== "free" && cancelAtPeriodEnd && renewDate ? (
        <div className="border border-[color:var(--border)] bg-white px-4 py-3 text-[12.5px] leading-5 text-[color:var(--ink-soft)]">
          <p>
            Your{" "}
            <span className="text-[color:var(--ink)]">
              {effectivePlan?.name ?? "current"}
            </span>{" "}
            plan is active until{" "}
            <span className="text-[color:var(--ink)]">{renewDate}</span>.{" "}
            <button
              type="button"
              onClick={openBillingPortal}
              disabled={billingPortalBusy}
              className="text-[color:var(--ink)] underline decoration-[color:var(--ink-faint)] underline-offset-[3px] transition hover:decoration-[color:var(--ink-soft)] disabled:cursor-not-allowed disabled:opacity-60"
            >
              {billingPortalBusy ? "Opening…" : "Manage billing"}
            </button>{" "}
            to adjust your plan.
          </p>
          {billingPortalError ? (
            <p className="mt-1 text-[12px] leading-5 text-[color:var(--accent-strong)]">
              {billingPortalError}
            </p>
          ) : null}
        </div>
      ) : null}

      {/* Active Abroad Pass — show creation-access-through date. */}
      {isAbroadActive && renewDate ? (
        <div className="border border-[color:var(--border)] bg-white px-4 py-3 text-[12.5px] leading-5 text-[color:var(--ink-soft)]">
          <p>
            <span className="text-[color:var(--ink)]">Abroad Pass active.</span>{" "}
            Creation access through{" "}
            <span className="text-[color:var(--ink)]">{renewDate}</span>. After
            that, your galleries stay viewable and shareable; new uploads will
            need an active plan.
          </p>
        </div>
      ) : null}

      {/* Legacy Max users — Max is no longer offered to new users, but
          existing subscribers stay on it indefinitely until they choose
          to switch. */}
      {isLegacyMax ? (
        <div className="border border-[color:var(--border)] bg-white px-4 py-3 text-[12.5px] leading-5 text-[color:var(--ink-soft)]">
          <p>
            You&apos;re on the{" "}
            <span className="text-[color:var(--ink)]">Max</span> plan. You can
            stay on Max as long as your subscription is active, or switch to
            one of the plans below at any time.
          </p>
        </div>
      ) : null}

      {/* ── Plan picker row: Free / Plus / Abroad Pass ────────────────── */}
      <div className="grid items-stretch gap-4 md:grid-cols-3 md:gap-5">
        {pickerPlans.map((plan) => (
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

      {/* ── Founder offer — small, subtle banner reusing the existing
          Founder checkout flow. Not rendered as a fourth card. ─────── */}
      {founderPlan ? (
        <FounderOfferBanner
          isCurrent={effectivePlanId === "lifetime"}
          isBusy={busyPlanId === "lifetime"}
          buttonLabel={founderLabel(busyPlanId === "lifetime")}
          effectivePlanId={effectivePlanId}
          onSelect={() => handleSelect(founderPlan)}
        />
      ) : null}

      {/* Legal acknowledgement near checkout. Quiet line beneath the plans. */}
      <p className="text-center text-[11.5px] leading-5 text-[color:var(--ink-soft)]">
        Continuing checkout means you agree to Memora&apos;s{" "}
        <Link
          href="/terms"
          className="text-[color:var(--ink)] underline decoration-[color:var(--ink-faint)] underline-offset-[3px] transition hover:decoration-[color:var(--ink-soft)]"
        >
          Terms of Service
        </Link>{" "}
        and{" "}
        <Link
          href="/privacy"
          className="text-[color:var(--ink)] underline decoration-[color:var(--ink-faint)] underline-offset-[3px] transition hover:decoration-[color:var(--ink-soft)]"
        >
          Privacy Policy
        </Link>
        .
      </p>

      {info ? (
        <p className="border border-[color:var(--border)] bg-[color:var(--paper)] px-3 py-2 text-[13px] leading-6 text-[color:var(--ink)]">
          {info}
        </p>
      ) : null}

      {error ? (
        <p className="border border-[#c98282] bg-[#fff7f7] px-3 py-2 text-[13px] leading-6 text-[#9a4545]">
          {error}
        </p>
      ) : null}
    </section>
  );
}
