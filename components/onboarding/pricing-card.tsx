import { Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import type { MembershipPlan } from "@/lib/plans";

export function PricingCard({
  plan,
  isCurrent = false,
  buttonLabel,
  onSelect,
}: {
  plan: MembershipPlan;
  isCurrent?: boolean;
  buttonLabel?: string;
  onSelect: (plan: MembershipPlan) => void;
}) {
  const ctaText = buttonLabel ?? (plan.id === "free" ? "Start Free" : "Select Plan");

  return (
    <div
      className={`flex h-full flex-col justify-between overflow-hidden rounded-[2rem] border p-6 ${
        plan.featured
          ? "border-[color:var(--border-strong)] bg-[rgba(240,246,252,0.98)] shadow-[0_22px_80px_rgba(34,49,71,0.10)]"
          : "border-[color:var(--border)] bg-[rgba(255,255,255,0.86)]"
      }`}
    >
      <div className="space-y-4">
        <div className="flex items-start gap-4">
          <div className="flex-shrink-0">
            <h3 className="font-serif text-4xl text-[color:var(--ink)]">{plan.name}</h3>
            <p className="mt-2 font-serif text-4xl leading-tight text-[color:var(--ink)]">
              {plan.priceMonthlyLabel}
            </p>
          </div>
          {isCurrent ? (
            <span className="border border-[color:var(--border-strong)] px-2 py-1 text-[10px] uppercase tracking-[0.2em] text-[color:var(--ink)]">
              Current
            </span>
          ) : null}
        </div>

        <p className="text-sm leading-7 text-[color:var(--ink-soft)]">{plan.summary}</p>
      </div>

      <div className="mt-6 flex flex-1 flex-col justify-between border-t border-[color:var(--border)] pt-5">
        <ul className={plan.id === "pro" ? "space-y-2" : "space-y-3"}>
          {plan.features.map((feature) => (
            <li key={feature} className="flex items-start gap-3 text-sm leading-6 text-[color:var(--ink-soft)]">
              <Check className="mt-0.5 h-4 w-4 text-[color:var(--accent-strong)]" />
              <span>{feature}</span>
            </li>
          ))}
        </ul>

        <div className="mt-auto pt-2">
          <Button
            type="button"
            className="w-full justify-center"
            variant={isCurrent ? "secondary" : "primary"}
            disabled={isCurrent}
            onClick={() => onSelect(plan)}
          >
            {ctaText}
          </Button>
        </div>
      </div>
    </div>
  );
}
