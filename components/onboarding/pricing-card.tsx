import { Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import type { MembershipPlan } from "@/lib/plans";

export function PricingCard({
  plan,
  isCurrent = false,
  isBusy = false,
  buttonLabel,
  onSelect,
}: {
  plan: MembershipPlan;
  isCurrent?: boolean;
  isBusy?: boolean;
  buttonLabel?: string;
  onSelect: (plan: MembershipPlan) => void;
}) {
  const ctaText = buttonLabel ?? (plan.id === "free" ? "Start Free" : "Select Plan");

  return (
    <div
      className={`flex h-full flex-col justify-between overflow-hidden rounded-[0.95rem] border p-3 md:p-4 ${
        plan.featured
          ? "border-[color:var(--border-strong)] bg-[rgba(246,250,255,0.95)]"
          : "border-[color:var(--border)] bg-[rgba(255,255,255,0.86)]"
      }`}
    >
      <div className="space-y-2.5 md:space-y-3">
        <div className="flex items-start gap-3">
          <div className="flex-shrink-0">
            <h3 className="font-serif text-2xl text-[color:var(--ink)] md:text-3xl">{plan.name}</h3>
            <p className="mt-1 font-serif text-2xl leading-tight text-[color:var(--ink)] md:mt-1.5 md:text-3xl">
              {plan.priceMonthlyLabel}
            </p>
          </div>
          {isCurrent ? (
            <span className="border border-[color:var(--border-strong)] px-2 py-1 text-[10px] uppercase tracking-[0.2em] text-[color:var(--ink)]">
              Current
            </span>
          ) : null}
        </div>

        <p className="text-xs leading-5 text-[color:var(--ink-soft)] md:text-sm md:leading-6">{plan.summary}</p>
      </div>

      <div className="mt-3 flex flex-1 flex-col justify-between border-t border-[color:var(--border)] pt-3 md:mt-4 md:pt-4">
        <ul className={plan.id === "max" ? "space-y-1.5" : "space-y-2"}>
          {plan.features.map((feature) => (
            <li key={feature} className="flex items-start gap-2 text-xs leading-5 text-[color:var(--ink-soft)] md:text-sm md:leading-6">
              <Check className="mt-0.5 h-3.5 w-3.5 text-[color:var(--accent-strong)]" />
              <span>{feature}</span>
            </li>
          ))}
        </ul>

        <div className="mt-auto pt-1.5">
          <Button
            type="button"
            className="w-full justify-center py-2 text-[11px]"
            variant={isCurrent ? "secondary" : "primary"}
            disabled={isCurrent || isBusy}
            onClick={() => onSelect(plan)}
          >
            {ctaText}
          </Button>
        </div>
      </div>
    </div>
  );
}
