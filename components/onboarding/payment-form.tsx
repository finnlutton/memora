"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useMemoraStore } from "@/hooks/use-memora-store";
import { PaymentMethodSelector } from "@/components/onboarding/payment-method-selector";
import type { MembershipPlan } from "@/lib/plans";

const fieldClassName =
  "w-full rounded-sm border border-[color:var(--border)] bg-white px-4 py-3 text-sm text-[color:var(--ink)] outline-none transition placeholder:text-[color:var(--ink-faint)] focus:border-[color:var(--accent)] focus:ring-1 focus:ring-[color:var(--accent)]/30";

type PaymentMethod = "card" | "apple-pay";

export function PaymentForm({ plan }: { plan: MembershipPlan }) {
  const router = useRouter();
  const { completeCheckout } = useMemoraStore();
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>("card");

  return (
    <div className="border border-[color:var(--border)] bg-[rgba(255,255,255,0.9)] p-6 md:p-8">
      <p className="text-[11px] uppercase tracking-[0.3em] text-[color:var(--ink-faint)]">
        Checkout
      </p>
      <h2 className="mt-4 font-serif text-4xl text-[color:var(--ink)]">Complete membership</h2>
      <p className="mt-3 text-sm leading-7 text-[color:var(--ink-soft)]">
        Annual billing. Cancel anytime. Existing galleries remain viewable if your plan changes later.
      </p>

      <div className="mt-6">
        <PaymentMethodSelector value={paymentMethod} onChange={setPaymentMethod} />
      </div>

      {paymentMethod === "apple-pay" ? (
        <div className="mt-6 space-y-4">
          <button
            type="button"
            onClick={() => {
              completeCheckout();
              router.push("/galleries");
            }}
            className="flex w-full items-center justify-center border border-black bg-black px-4 py-4 text-sm uppercase tracking-[0.2em] text-white transition hover:bg-[#111926]"
          >
            Pay with Apple Pay
          </button>
        </div>
      ) : (
        <form
          onSubmit={(event) => {
            event.preventDefault();
            completeCheckout();
            router.push("/galleries");
          }}
          className="mt-6 space-y-4"
        >
          <label className="block space-y-2">
            <span className="text-[11px] uppercase tracking-[0.22em] text-[color:var(--ink-faint)]">
              Name on card
            </span>
            <input className={fieldClassName} placeholder="Avery Morgan" required />
          </label>
          <label className="block space-y-2">
            <span className="text-[11px] uppercase tracking-[0.22em] text-[color:var(--ink-faint)]">
              Card number
            </span>
            <input className={fieldClassName} placeholder="4242 4242 4242 4242" required />
          </label>
          <div className="grid gap-4 sm:grid-cols-3">
            <label className="block space-y-2">
              <span className="text-[11px] uppercase tracking-[0.22em] text-[color:var(--ink-faint)]">
                Expiration
              </span>
              <input className={fieldClassName} placeholder="09 / 29" required />
            </label>
            <label className="block space-y-2">
              <span className="text-[11px] uppercase tracking-[0.22em] text-[color:var(--ink-faint)]">
                CVC
              </span>
              <input className={fieldClassName} placeholder="123" required />
            </label>
            <label className="block space-y-2">
              <span className="text-[11px] uppercase tracking-[0.22em] text-[color:var(--ink-faint)]">
                ZIP / postal
              </span>
              <input className={fieldClassName} placeholder="10001" required />
            </label>
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <label className="block space-y-2">
              <span className="text-[11px] uppercase tracking-[0.22em] text-[color:var(--ink-faint)]">
                Country
              </span>
              <input className={fieldClassName} placeholder="United States" required />
            </label>
            <label className="block space-y-2">
              <span className="text-[11px] uppercase tracking-[0.22em] text-[color:var(--ink-faint)]">
                Billing email
              </span>
              <input className={fieldClassName} placeholder="you@example.com" required />
            </label>
          </div>
          <Button type="submit" className="mt-3 w-full justify-center">
            Complete purchase
            <ArrowRight className="h-4 w-4" />
          </Button>
        </form>
      )}

      <div className="mt-6 border-t border-[color:var(--border)] pt-4 text-xs leading-6 text-[color:var(--ink-faint)]">
        Memora membership is billed annually at ${plan.price}. This is a polished front-end prototype; no real payment is processed yet.
      </div>
    </div>
  );
}
