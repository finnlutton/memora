"use client";

import { Check } from "lucide-react";
import type { MembershipPlan } from "@/lib/plans";

/**
 * Editorial recurring-plan card.
 *
 * Three of these render in a single row on the membership page (Free,
 * Plus, Max). The featured plan (`plan.featured`) gets a soft tint, a
 * "Recommended" pill, and a slightly lifted shadow — restrained, not
 * shouty. Everything else is identical so plans read as comparable
 * options, not as a hierarchy with one obvious winner.
 *
 * Card content is driven entirely by the centralized plan config; this
 * component intentionally has no plan-specific copy or limits.
 */

export function RecurringPlanCard({
  plan,
  isCurrent,
  isBusy,
  buttonLabel,
  onSelect,
}: {
  plan: MembershipPlan;
  isCurrent: boolean;
  isBusy: boolean;
  buttonLabel: string;
  onSelect: (plan: MembershipPlan) => void;
}) {
  const featured = Boolean(plan.featured);
  const isFree = plan.id === "free";

  return (
    <article
      className={`relative flex h-full flex-col overflow-hidden border bg-white p-5 transition md:p-6 ${
        featured
          ? "border-[color:var(--ink)]/60 shadow-[0_18px_48px_-26px_rgba(14,22,34,0.28)]"
          : "border-[color:var(--border)] shadow-[0_8px_22px_-18px_rgba(14,22,34,0.18)]"
      } ${isCurrent ? "ring-1 ring-[color:var(--ink)]/30" : ""}`}
    >
      {featured ? (
        <span className="absolute right-4 top-4 inline-flex items-center bg-[color:var(--ink)] px-2.5 py-1 text-[9.5px] font-medium uppercase tracking-[0.22em] text-white">
          Recommended
        </span>
      ) : null}
      {isCurrent ? (
        <span
          className={`absolute ${
            featured ? "left-4 top-4" : "right-4 top-4"
          } inline-flex items-center border border-[color:var(--ink)]/35 bg-white px-2.5 py-1 text-[9.5px] font-medium uppercase tracking-[0.22em] text-[color:var(--ink-soft)]`}
        >
          Current plan
        </span>
      ) : null}

      {/* ── Header: name + price ───────────────────────────────────── */}
      <header className="pt-7">
        <p className="text-[10.5px] font-medium uppercase tracking-[0.26em] text-[color:var(--ink-faint)]">
          {plan.name}
        </p>
        <div className="mt-3 flex items-baseline gap-1.5">
          <span className="font-serif text-[40px] leading-none text-[color:var(--ink)] md:text-[44px]">
            {plan.priceMonthlyLabel}
          </span>
          {!isFree ? (
            <span className="text-[12px] font-medium tracking-wide text-[color:var(--ink-soft)]">
              / month
            </span>
          ) : null}
        </div>
        <p className="mt-3 text-[13.5px] leading-6 text-[color:var(--ink-soft)]">
          {plan.summary}
        </p>
      </header>

      {/* ── Divider ────────────────────────────────────────────────── */}
      <div
        aria-hidden
        className="my-5 h-px w-full bg-[color:var(--border)]"
      />

      {/* ── Features ───────────────────────────────────────────────── */}
      <ul className="flex-1 space-y-2.5">
        {plan.features.map((feature) => (
          <li
            key={feature}
            className="flex items-start gap-2.5 text-[13px] leading-6 text-[color:var(--ink)] md:text-[13.5px]"
          >
            <Check
              className="mt-0.5 h-3.5 w-3.5 shrink-0 text-[color:var(--ink-soft)]"
              strokeWidth={2.2}
            />
            <span>{feature}</span>
          </li>
        ))}
      </ul>

      {/* ── CTA ────────────────────────────────────────────────────── */}
      <div className="mt-6">
        <button
          type="button"
          onClick={() => onSelect(plan)}
          disabled={isCurrent || isBusy}
          className={`inline-flex w-full items-center justify-center px-4 py-3 text-[11px] font-semibold uppercase tracking-[0.2em] transition disabled:cursor-not-allowed ${
            isCurrent
              ? "border border-[color:var(--border-strong)] bg-white text-[color:var(--ink-soft)]"
              : featured
                ? "bg-[color:var(--ink)] text-white hover:bg-[color:var(--ink-soft)] disabled:opacity-70"
                : "border border-[color:var(--ink)] bg-white text-[color:var(--ink)] hover:bg-[color:var(--ink)] hover:text-white disabled:opacity-60"
          }`}
        >
          {buttonLabel}
        </button>
      </div>
    </article>
  );
}
