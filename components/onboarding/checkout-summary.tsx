import type { MembershipPlan } from "@/lib/plans";

export function CheckoutSummary({ plan }: { plan: MembershipPlan }) {
  const galleryCapacityLabel = Number.isFinite(plan.galleryCount)
    ? `${plan.galleryCount} active galleries`
    : "Unlimited galleries";

  const effectiveRateLabel =
    plan.effectiveCost === "Custom" ? plan.effectiveCost : `${plan.effectiveCost} / gallery / year`;

  return (
    <div className="border border-[color:var(--border)] bg-[rgba(245,248,252,0.92)] p-6 md:p-8">
      <p className="text-[11px] uppercase tracking-[0.3em] text-[color:var(--ink-faint)]">
        Selected plan
      </p>
      <h2 className="mt-4 font-serif text-4xl text-[color:var(--ink)]">
        {galleryCapacityLabel}
      </h2>
      <p className="mt-3 text-sm leading-7 text-[color:var(--ink-soft)]">{plan.summary}</p>

      <div className="mt-8 grid gap-4 border-t border-[color:var(--border)] pt-5 text-sm text-[color:var(--ink-soft)]">
        <SummaryRow label="Annual price" value={`$${plan.price} / year`} />
        <SummaryRow label="Gallery capacity" value={galleryCapacityLabel} />
        <SummaryRow label="Effective rate" value={effectiveRateLabel} />
      </div>
    </div>
  );
}

function SummaryRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-start justify-between gap-4 border-b border-[color:var(--border)] pb-4 last:border-b-0 last:pb-0">
      <span className="text-[11px] uppercase tracking-[0.22em] text-[color:var(--ink-faint)]">
        {label}
      </span>
      <span className="text-right text-[color:var(--ink)]">{value}</span>
    </div>
  );
}
