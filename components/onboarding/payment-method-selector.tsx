type PaymentMethod = "card" | "apple-pay";

export function PaymentMethodSelector({
  value,
  onChange,
}: {
  value: PaymentMethod;
  onChange: (value: PaymentMethod) => void;
}) {
  return (
    <div className="grid gap-3 sm:grid-cols-2">
      <button
        type="button"
        onClick={() => onChange("card")}
        className={`border px-4 py-4 text-left ${
          value === "card"
            ? "border-[color:var(--border-strong)] bg-[color:var(--paper)]"
            : "border-[color:var(--border)] bg-white"
        }`}
      >
        <p className="text-[11px] uppercase tracking-[0.22em] text-[color:var(--ink-faint)]">
          Payment method
        </p>
        <p className="mt-3 font-serif text-2xl text-[color:var(--ink)]">Credit / Debit Card</p>
      </button>
      <button
        type="button"
        onClick={() => onChange("apple-pay")}
        className={`border px-4 py-4 text-left ${
          value === "apple-pay"
            ? "border-[color:var(--border-strong)] bg-[color:var(--paper)]"
            : "border-[color:var(--border)] bg-white"
        }`}
      >
        <p className="text-[11px] uppercase tracking-[0.22em] text-[color:var(--ink-faint)]">
          Quick pay
        </p>
        <p className="mt-3 font-serif text-2xl text-[color:var(--ink)]">Apple Pay</p>
      </button>
    </div>
  );
}
