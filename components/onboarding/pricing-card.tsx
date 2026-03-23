import { Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import type { MembershipPlan } from "@/lib/plans";

export function PricingCard({
  plan,
  onSelect,
}: {
  plan: MembershipPlan;
  onSelect: (plan: MembershipPlan) => void;
}) {
  return (
    <div
      className={`flex h-full flex-col justify-between border p-6 ${
        plan.recommended
          ? "border-[color:var(--border-strong)] bg-[rgba(240,246,252,0.92)]"
          : "border-[color:var(--border)] bg-[rgba(255,255,255,0.86)]"
      }`}
    >
      <div>
        <div className="flex items-start justify-between gap-4">
          <div>
            <p className="text-[11px] uppercase tracking-[0.28em] text-[color:var(--ink-faint)]">
              {plan.galleryCount} active galleries
            </p>
            <h3 className="mt-4 font-serif text-4xl text-[color:var(--ink)]">
              ${plan.price}
              <span className="ml-2 text-lg text-[color:var(--ink-soft)]">/ year</span>
            </h3>
          </div>
          {plan.recommended ? (
            <span className="border border-[color:var(--border-strong)] bg-white px-3 py-2 text-[10px] uppercase tracking-[0.24em] text-[color:var(--ink)]">
              Recommended
            </span>
          ) : null}
        </div>
        <p className="mt-5 text-sm leading-7 text-[color:var(--ink-soft)]">{plan.summary}</p>
      </div>

      <div className="mt-8 space-y-5 border-t border-[color:var(--border)] pt-5">
        <div className="flex items-center gap-2 text-sm text-[color:var(--ink-soft)]">
          <Check className="h-4 w-4 text-[color:var(--accent-strong)]" />
          Effective cost: {plan.effectiveCost} per gallery / year
        </div>
        <Button type="button" className="w-full justify-center" onClick={() => onSelect(plan)}>
          Select plan
        </Button>
      </div>
    </div>
  );
}
