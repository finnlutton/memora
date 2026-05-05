"use client";

import { Sparkles } from "lucide-react";
import type { MembershipPlanId } from "@/lib/plans";

/**
 * Small Founder offer banner.
 *
 * Replaces the previous LifetimeSection feature block. Founder is no
 * longer a full pricing card — just a one-line callout with a "View
 * Founder offer" CTA that drops into the existing
 * /api/stripe/change-plan + /api/stripe/create-checkout-session flow
 * (same `onSelect` handler the old card used).
 *
 * Backend still keys on `lifetime` everywhere — env vars, webhook,
 * `selected_plan` column — so reusing the existing handler is
 * intentional. This component only changes the visual treatment.
 */

export function FounderOfferBanner({
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
  const showOverlapNote =
    !isCurrent && (effectivePlanId === "plus" || effectivePlanId === "max");

  return (
    <section
      aria-label="Founder offer"
      className="border border-[#c8aa75] bg-[#efe2c8] px-5 py-4"
    >
      <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
        <div className="min-w-0">
          <p className="inline-flex items-center gap-1.5 text-[10.5px] font-medium uppercase tracking-[0.22em] text-[#9c805a]">
            <Sparkles className="h-3 w-3" strokeWidth={1.8} />
            Limited Founder Offer
          </p>
          <p className="mt-1 text-[13.5px] leading-6 text-[#3e2f1a]">
            Special pricing is available for early users.
          </p>
          {showOverlapNote ? (
            <p className="mt-1 text-[11.5px] leading-5 text-[#5a4628]">
              Already on a paid plan? Cancel from{" "}
              <span className="text-[#3e2f1a]">Manage billing</span> first to
              avoid a brief overlap.
            </p>
          ) : null}
        </div>
        <button
          type="button"
          onClick={onSelect}
          disabled={isCurrent || isBusy}
          className={`inline-flex shrink-0 items-center justify-center px-4 py-2.5 text-[11px] font-semibold uppercase tracking-[0.2em] transition disabled:cursor-not-allowed disabled:opacity-60 ${
            isCurrent
              ? "border border-[#c8aa75] bg-white text-[#5a4628]"
              : "bg-[#3e2f1a] text-[#efe2c8] hover:bg-[#564028]"
          }`}
        >
          {buttonLabel}
        </button>
      </div>
    </section>
  );
}
