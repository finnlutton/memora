"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useMemoraStore } from "@/hooks/use-memora-store";
import type { MembershipPlan } from "@/lib/plans";

export function PaymentForm({ plan }: { plan: MembershipPlan }) {
  const router = useRouter();
  const { completeCheckout } = useMemoraStore();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleCompleteCheckout = async () => {
    setBusy(true);
    setError(null);

    try {
      await completeCheckout(plan.id);
      router.push("/galleries");
    } catch (checkoutError) {
      setError(
        checkoutError instanceof Error
          ? checkoutError.message
          : "Unable to complete membership right now.",
      );
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="border border-[color:var(--border)] bg-[rgba(255,255,255,0.9)] p-6 md:p-8">
      <p className="text-[11px] uppercase tracking-[0.3em] text-[color:var(--ink-faint)]">
        Checkout
      </p>
      <h2 className="mt-4 font-serif text-4xl text-[color:var(--ink)]">Complete membership</h2>
      <p className="mt-3 text-sm leading-7 text-[color:var(--ink-soft)]">
        Annual billing. Cancel anytime. Existing galleries remain viewable if your plan changes later.
      </p>

      <div className="mt-6 rounded-sm border border-[rgba(180,140,60,0.35)] bg-[rgba(255,249,232,0.9)] px-4 py-3 text-sm leading-6 text-[rgba(130,95,20,0.9)]">
        Payment processing is not yet active. Confirming your plan selection will update your account — no charge will be made.
      </div>

      <Button
        type="button"
        className="mt-6 w-full justify-center"
        disabled={busy}
        onClick={() => void handleCompleteCheckout()}
      >
        {busy ? "Confirming..." : "Select this plan"}
        <ArrowRight className="h-4 w-4" />
      </Button>

      {error ? (
        <p className="mt-4 rounded-sm border border-[#c98282] bg-[#fff7f7] px-3 py-2 text-sm leading-6 text-[#9a4545]">
          {error}
        </p>
      ) : null}

      <div className="mt-6 border-t border-[color:var(--border)] pt-4 text-xs leading-6 text-[color:var(--ink-faint)]">
        Memora membership will be billed annually at ${plan.price} once payment is live.
      </div>
    </div>
  );
}
