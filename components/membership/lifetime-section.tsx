"use client";

import { Check, Sparkles } from "lucide-react";
import { getPlan, type MembershipPlanId } from "@/lib/plans";

/**
 * Lifetime — separate, horizontally-laid-out feature section.
 *
 * Renders below the recurring plans. Visually distinct: warmer surface,
 * larger title, two-column layout (pitch on the left, features + CTA on
 * the right) so it never reads as a 4th equal monthly tier.
 *
 * Driven entirely by the centralized plan config — no hard-coded copy.
 */

export function LifetimeSection({
  isCurrent,
  isBusy,
  buttonLabel,
  effectivePlanId,
  onSelect,
}: {
  isCurrent: boolean;
  isBusy: boolean;
  buttonLabel: string;
  effectivePlanId: MembershipPlanId;
  onSelect: () => void;
}) {
  const plan = getPlan("lifetime");

  // Free / Plus / Max users see a "lifetime alternative" framing; for
  // anyone already on Lifetime we just show "Current plan" state.
  return (
    <section className="relative mx-auto mt-10 w-full max-w-5xl overflow-hidden border border-[color:var(--ink)]/15 bg-[linear-gradient(135deg,rgba(252,247,241,1)_0%,rgba(244,237,228,1)_100%)] md:mt-14">
      <div className="relative grid grid-cols-1 gap-6 p-6 md:grid-cols-[1.15fr_1fr] md:gap-10 md:p-9">
        {/* ── Left: pitch ──────────────────────────────────────────── */}
        <div>
          <p className="inline-flex items-center gap-1.5 text-[10.5px] font-medium uppercase tracking-[0.26em] text-[color:var(--ink-soft)]">
            <Sparkles className="h-3 w-3" strokeWidth={1.8} />
            One-time purchase
          </p>
          <h3 className="mt-3 font-serif text-[30px] leading-[1.05] text-[color:var(--ink)] md:text-[40px]">
            Memora Lifetime.
          </h3>
          <p className="mt-3 max-w-md text-[14px] leading-7 text-[color:var(--ink-soft)] md:text-[15px]">
            {plan.summary} For people who plan to keep using Memora for
            years — pay once, never see a renewal, and lock in
            founding-supporter pricing.
          </p>
        </div>

        {/* ── Right: features + price + CTA ────────────────────────── */}
        <div className="flex flex-col justify-between gap-5 border-t border-[color:var(--ink)]/15 pt-6 md:border-l md:border-t-0 md:pl-10 md:pt-0">
          <ul className="space-y-2.5">
            {plan.features.map((feature) => (
              <li
                key={feature}
                className="flex items-start gap-2.5 text-[13.5px] leading-6 text-[color:var(--ink)]"
              >
                <Check
                  className="mt-0.5 h-3.5 w-3.5 shrink-0 text-[color:var(--ink-soft)]"
                  strokeWidth={2.2}
                />
                <span>{feature}</span>
              </li>
            ))}
          </ul>

          <div className="mt-2 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
            <p className="font-serif text-[32px] leading-none text-[color:var(--ink)] md:text-[36px]">
              {plan.priceMonthlyLabel}
            </p>
            <button
              type="button"
              onClick={onSelect}
              disabled={isCurrent || isBusy}
              className={`inline-flex items-center justify-center px-5 py-3 text-[11px] font-semibold uppercase tracking-[0.2em] transition disabled:cursor-not-allowed disabled:opacity-60 ${
                isCurrent
                  ? "border border-[color:var(--border-strong)] bg-white text-[color:var(--ink-soft)]"
                  : "bg-[color:var(--ink)] text-white hover:bg-[color:var(--ink-soft)]"
              }`}
            >
              {buttonLabel}
            </button>
          </div>

          {/* Honest note for users with an active recurring plan. */}
          {!isCurrent && (effectivePlanId === "plus" || effectivePlanId === "max") ? (
            <p className="text-[11.5px] leading-5 text-[color:var(--ink-soft)]">
              Already on a paid plan? Cancel your subscription from{" "}
              <span className="text-[color:var(--ink)]">Manage billing</span>{" "}
              first to avoid being charged twice.
            </p>
          ) : null}
        </div>
      </div>
    </section>
  );
}
