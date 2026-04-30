"use client";

import Link from "next/link";
import { useState } from "react";
import { useBillingStatus } from "@/hooks/use-billing-status";
import { getPlan } from "@/lib/plans";

/**
 * Billing status card.
 *
 * Renders one of four states using only the profile fields exposed via
 * /api/billing/status. Stays minimal — a small block of plain text with
 * one action button. Embeddable on Settings and Membership pages.
 */

function formatDate(iso: string | null) {
  if (!iso) return null;
  try {
    return new Date(iso).toLocaleDateString("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
    });
  } catch {
    return null;
  }
}

function ManageBillingInline() {
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  const onClick = async () => {
    if (busy) return;
    setBusy(true);
    setMessage(null);
    try {
      const response = await fetch("/api/stripe/create-portal-session", {
        method: "POST",
      });
      const data = (await response.json()) as {
        url?: string;
        message?: string;
        error?: string;
      };
      if (response.ok && data.url) {
        window.location.href = data.url;
        return;
      }
      setMessage(
        data.message ?? data.error ?? "Could not open billing portal.",
      );
    } catch {
      setMessage("Could not reach billing portal. Try again in a moment.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div>
      <button
        type="button"
        onClick={onClick}
        disabled={busy}
        className="inline-flex items-center justify-center border border-[color:var(--border-strong)] bg-white px-3.5 py-2 text-[11px] font-medium uppercase tracking-[0.18em] text-[color:var(--ink)] transition hover:bg-[color:var(--paper)] disabled:cursor-not-allowed disabled:opacity-60"
      >
        {busy ? "Opening…" : "Manage billing"}
      </button>
      {message ? (
        <p className="mt-2 max-w-sm text-[12px] leading-5 text-[color:var(--ink-soft)]">
          {message}
        </p>
      ) : null}
    </div>
  );
}

export function BillingStatusCard() {
  const { status, loading, error } = useBillingStatus();

  if (loading) {
    return (
      <div className="border border-[color:var(--border)] bg-white px-4 py-4">
        <p className="text-[10px] font-medium uppercase tracking-[0.22em] text-[color:var(--ink-soft)]">
          Billing
        </p>
        <p className="mt-2 text-[13px] leading-6 text-[color:var(--ink-soft)]">
          Loading your billing status…
        </p>
      </div>
    );
  }

  if (error || !status) {
    return (
      <div className="border border-[color:var(--border)] bg-white px-4 py-4">
        <p className="text-[10px] font-medium uppercase tracking-[0.22em] text-[color:var(--ink-soft)]">
          Billing
        </p>
        <p className="mt-2 text-[13px] leading-6 text-[color:var(--accent-strong)]">
          {error ?? "Could not load billing status."}
        </p>
      </div>
    );
  }

  const plan = getPlan(status.planId);
  const renewDate = formatDate(status.currentPeriodEnd);

  // ── State 4: Internal/founder ───────────────────────────────────────
  if (status.isInternal) {
    return (
      <div className="border border-[color:var(--border)] bg-white px-4 py-4">
        <p className="text-[10px] font-medium uppercase tracking-[0.22em] text-[color:var(--ink-soft)]">
          Billing
        </p>
        <p className="mt-3 font-serif text-[20px] leading-tight text-[color:var(--ink)]">
          Current plan: Full Access
        </p>
        <p className="mt-2 text-[13px] leading-6 text-[color:var(--ink-soft)]">
          No billing required for this account.
        </p>
        {status.hasStripeCustomer ? (
          <div className="mt-4">
            <ManageBillingInline />
          </div>
        ) : null}
      </div>
    );
  }

  // ── State 3: Free plan ───────────────────────────────────────────────
  if (status.planId === "free") {
    return (
      <div className="border border-[color:var(--border)] bg-white px-4 py-4">
        <p className="text-[10px] font-medium uppercase tracking-[0.22em] text-[color:var(--ink-soft)]">
          Billing
        </p>
        <p className="mt-3 font-serif text-[20px] leading-tight text-[color:var(--ink)]">
          Current plan: Free
        </p>
        <div className="mt-4">
          <Link
            href="/galleries/settings/membership"
            className="inline-flex items-center justify-center bg-[color:var(--ink)] px-3.5 py-2 text-[11px] font-semibold uppercase tracking-[0.18em] text-white transition hover:bg-[color:var(--ink-soft)]"
          >
            Upgrade plan
          </Link>
        </div>
      </div>
    );
  }

  // ── State 2: Paid plan, cancel_at_period_end = true ─────────────────
  if (status.cancelAtPeriodEnd) {
    return (
      <div className="border border-[color:var(--border)] bg-white px-4 py-4">
        <p className="text-[10px] font-medium uppercase tracking-[0.22em] text-[color:var(--ink-soft)]">
          Billing
        </p>
        <p className="mt-3 font-serif text-[20px] leading-tight text-[color:var(--ink)]">
          Current plan: {plan.name}
        </p>
        {renewDate ? (
          <p className="mt-2 text-[13px] leading-6 text-[color:var(--ink-soft)]">
            Active until {renewDate}.
          </p>
        ) : null}
        <p className="mt-1 text-[12.5px] leading-6 text-[color:var(--ink-soft)]">
          Your subscription has been canceled and will not renew.
        </p>
        <div className="mt-4">
          <ManageBillingInline />
        </div>
      </div>
    );
  }

  // ── State 1: Active paid plan, not canceled ─────────────────────────
  // Lifetime is a one-time purchase — no renewal date, no cancel.
  if (status.planId === "lifetime") {
    return (
      <div className="border border-[color:var(--border)] bg-white px-4 py-4">
        <p className="text-[10px] font-medium uppercase tracking-[0.22em] text-[color:var(--ink-soft)]">
          Billing
        </p>
        <p className="mt-3 font-serif text-[20px] leading-tight text-[color:var(--ink)]">
          Current plan: Lifetime
        </p>
        <p className="mt-2 text-[13px] leading-6 text-[color:var(--ink-soft)]">
          Paid once. Full access for life.
        </p>
        {status.hasStripeCustomer ? (
          <div className="mt-4">
            <ManageBillingInline />
          </div>
        ) : null}
      </div>
    );
  }

  return (
    <div className="border border-[color:var(--border)] bg-white px-4 py-4">
      <p className="text-[10px] font-medium uppercase tracking-[0.22em] text-[color:var(--ink-soft)]">
        Billing
      </p>
      <p className="mt-3 font-serif text-[20px] leading-tight text-[color:var(--ink)]">
        Current plan: {plan.name}
      </p>
      {renewDate ? (
        <p className="mt-2 text-[13px] leading-6 text-[color:var(--ink-soft)]">
          Renews on {renewDate}.
        </p>
      ) : null}
      <div className="mt-4">
        <ManageBillingInline />
      </div>
    </div>
  );
}
