"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";

/**
 * Admin panel section for the ambassador commission ledger.
 *
 * Loads from GET /api/admin/ambassador-commissions, renders stat chips
 * and a table, and exposes a "Mark paid" button on each pending row
 * that POSTs to /api/admin/ambassador-commissions/:id/mark-paid.
 *
 * Mounted as a section inside <AdminControlPanel>; it owns its own
 * loading state so the rest of the panel doesn't have to know about
 * commissions.
 */

type StatusFilter = "all" | "pending" | "paid" | "void" | "refunded";

type Ambassador = {
  id: string;
  name: string;
  email: string | null;
  promotionCode: string;
  commissionRate: number;
  active: boolean;
};

type Commission = {
  id: string;
  ambassador: Ambassador | null;
  buyerEmail: string | null;
  buyerUserId: string | null;
  source: "one_time" | "subscription_initial" | "subscription_renewal" | string;
  planId: string | null;
  paymentAmountCents: number;
  commissionAmountCents: number;
  currency: string;
  status: "pending" | "paid" | "void" | "refunded" | string;
  notes: string | null;
  createdAt: string;
  paidAt: string | null;
  paidByAdminEmail: string | null;
  voidedAt: string | null;
  refundedAt: string | null;
  stripeRefs: {
    eventId: string;
    sessionId: string | null;
    invoiceId: string | null;
    paymentIntentId: string | null;
    chargeId: string | null;
  };
};

type Totals = Record<string, { count: number; commissionCents: number }>;

type ApiResponse = {
  commissions: Commission[];
  totals: Totals;
  cappedAt: number | null;
};

function formatMoney(cents: number, currency: string) {
  try {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: currency.toUpperCase(),
    }).format(cents / 100);
  } catch {
    return `$${(cents / 100).toFixed(2)}`;
  }
}

function formatDateTime(value: string | null) {
  if (!value) return "—";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
  }).format(date);
}

function sourceLabel(source: string) {
  if (source === "one_time") return "One-time";
  if (source === "subscription_initial") return "Sub (first)";
  if (source === "subscription_renewal") return "Sub (renewal)";
  return source;
}

function statusClassName(status: string) {
  if (status === "paid") return "text-[color:var(--ink)]";
  if (status === "refunded" || status === "void") return "text-[color:var(--ink-faint)]";
  return "text-[color:var(--ink)]";
}

export function AmbassadorCommissionsPanel() {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [data, setData] = useState<ApiResponse | null>(null);
  const [filter, setFilter] = useState<StatusFilter>("all");
  const [markingId, setMarkingId] = useState<string | null>(null);

  const load = async (statusFilter: StatusFilter = filter) => {
    setBusy(true);
    setError(null);
    try {
      const url =
        statusFilter === "all"
          ? "/api/admin/ambassador-commissions"
          : `/api/admin/ambassador-commissions?status=${encodeURIComponent(statusFilter)}`;
      const response = await fetch(url, { method: "GET" });
      const payload = (await response.json()) as ApiResponse & { error?: string };
      if (!response.ok) throw new Error(payload.error ?? "Could not load commissions.");
      setData({
        commissions: payload.commissions ?? [],
        totals: payload.totals ?? {},
        cappedAt: payload.cappedAt ?? null,
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not load commissions.");
    } finally {
      setBusy(false);
    }
  };

  const onChangeFilter = (next: StatusFilter) => {
    setFilter(next);
    if (data) void load(next);
  };

  const markPaid = async (commission: Commission) => {
    if (markingId) return;
    const confirmed = window.confirm(
      `Mark ${formatMoney(commission.commissionAmountCents, commission.currency)} commission to ${commission.ambassador?.name ?? "ambassador"} as paid? This cannot be undone from the UI.`,
    );
    if (!confirmed) return;
    setMarkingId(commission.id);
    setError(null);
    try {
      const response = await fetch(
        `/api/admin/ambassador-commissions/${commission.id}/mark-paid`,
        { method: "POST" },
      );
      const payload = (await response.json()) as { error?: string };
      if (!response.ok) throw new Error(payload.error ?? "Could not mark as paid.");
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not mark as paid.");
    } finally {
      setMarkingId(null);
    }
  };

  const filterOptions: StatusFilter[] = ["all", "pending", "paid", "void", "refunded"];

  return (
    <section className="border-b border-[rgba(34,52,79,0.08)] pb-4">
      <p className="text-[10px] font-semibold uppercase tracking-[0.24em] text-[color:var(--ink)]">
        Ambassador commissions
      </p>
      <p className="mt-2 text-sm text-[color:var(--ink-soft)]">
        Pending, paid, void, and refunded commission rows. Add ambassadors via SQL
        (insert into <code>public.ambassadors</code>); rows accrue automatically when
        a successful payment uses their Stripe Promotion Code.
      </p>
      <div className="mt-3 flex flex-wrap items-center gap-2">
        <Button
          type="button"
          variant="secondary"
          disabled={busy}
          onClick={() => void load()}
        >
          {busy ? "Loading..." : data ? "Reload" : "Load commissions"}
        </Button>
        {data
          ? filterOptions.map((option) => (
              <button
                key={option}
                type="button"
                onClick={() => onChangeFilter(option)}
                disabled={busy}
                className={`border px-2.5 py-1 text-[11px] uppercase tracking-[0.18em] transition ${
                  filter === option
                    ? "border-[color:var(--ink)] bg-[color:var(--ink)] text-white"
                    : "border-[color:var(--border-strong)] bg-white text-[color:var(--ink)] hover:bg-[color:var(--paper)]"
                } disabled:cursor-not-allowed disabled:opacity-60`}
              >
                {option}
              </button>
            ))
          : null}
      </div>

      {error ? (
        <p className="mt-3 rounded-sm border border-[#c98282] bg-[#fff7f7] px-3 py-2 text-sm leading-6 text-[#9a4545]">
          {error}
        </p>
      ) : null}

      {data ? (
        <div className="mt-4 space-y-4">
          <div className="grid gap-3 md:grid-cols-4">
            <StatChip
              label="Pending"
              count={data.totals.pending?.count ?? 0}
              amountCents={data.totals.pending?.commissionCents ?? 0}
            />
            <StatChip
              label="Paid"
              count={data.totals.paid?.count ?? 0}
              amountCents={data.totals.paid?.commissionCents ?? 0}
            />
            <StatChip
              label="Void"
              count={data.totals.void?.count ?? 0}
              amountCents={data.totals.void?.commissionCents ?? 0}
            />
            <StatChip
              label="Refunded"
              count={data.totals.refunded?.count ?? 0}
              amountCents={data.totals.refunded?.commissionCents ?? 0}
            />
          </div>

          {data.cappedAt ? (
            <p className="text-[12px] text-[color:var(--ink-faint)]">
              Showing the most recent {data.cappedAt} rows. Add a date or
              ambassador filter to narrow further if you need to.
            </p>
          ) : null}

          {data.commissions.length === 0 ? (
            <p className="rounded-[1.25rem] border border-[color:var(--border)] bg-white/72 p-4 text-sm text-[color:var(--ink-soft)]">
              No commissions in this view.
            </p>
          ) : (
            <div className="overflow-x-auto rounded-[1.25rem] border border-[color:var(--border)] bg-white/72">
              <table className="min-w-full text-left text-sm">
                <thead className="text-[10px] uppercase tracking-[0.2em] text-[color:var(--ink-faint)]">
                  <tr>
                    <th className="px-3 py-2 font-medium">Created</th>
                    <th className="px-3 py-2 font-medium">Ambassador</th>
                    <th className="px-3 py-2 font-medium">Code</th>
                    <th className="px-3 py-2 font-medium">Buyer</th>
                    <th className="px-3 py-2 font-medium">Plan</th>
                    <th className="px-3 py-2 font-medium">Source</th>
                    <th className="px-3 py-2 font-medium text-right">Paid</th>
                    <th className="px-3 py-2 font-medium text-right">Commission</th>
                    <th className="px-3 py-2 font-medium">Status</th>
                    <th className="px-3 py-2 font-medium">Action</th>
                  </tr>
                </thead>
                <tbody>
                  {data.commissions.map((c) => (
                    <tr key={c.id} className="border-t border-[rgba(34,52,79,0.06)]">
                      <td className="px-3 py-2 whitespace-nowrap text-[color:var(--ink-soft)]">
                        {formatDateTime(c.createdAt)}
                      </td>
                      <td className="px-3 py-2 whitespace-nowrap text-[color:var(--ink)]">
                        {c.ambassador?.name ?? "—"}
                      </td>
                      <td className="px-3 py-2 whitespace-nowrap font-mono text-xs text-[color:var(--ink)]">
                        {c.ambassador?.promotionCode ?? "—"}
                      </td>
                      <td className="px-3 py-2 whitespace-nowrap text-[color:var(--ink-soft)]">
                        {c.buyerEmail ?? "—"}
                      </td>
                      <td className="px-3 py-2 whitespace-nowrap text-[color:var(--ink-soft)]">
                        {c.planId ?? "—"}
                      </td>
                      <td className="px-3 py-2 whitespace-nowrap text-[color:var(--ink-soft)]">
                        {sourceLabel(c.source)}
                      </td>
                      <td className="px-3 py-2 whitespace-nowrap text-right text-[color:var(--ink-soft)]">
                        {formatMoney(c.paymentAmountCents, c.currency)}
                      </td>
                      <td className="px-3 py-2 whitespace-nowrap text-right text-[color:var(--ink)]">
                        {formatMoney(c.commissionAmountCents, c.currency)}
                      </td>
                      <td
                        className={`px-3 py-2 whitespace-nowrap ${statusClassName(c.status)}`}
                      >
                        {c.status}
                        {c.status === "paid" && c.paidByAdminEmail ? (
                          <span className="block text-[10px] text-[color:var(--ink-faint)]">
                            by {c.paidByAdminEmail}
                          </span>
                        ) : null}
                      </td>
                      <td className="px-3 py-2 whitespace-nowrap">
                        {c.status === "pending" ? (
                          <Button
                            type="button"
                            variant="secondary"
                            disabled={markingId === c.id || busy}
                            onClick={() => void markPaid(c)}
                          >
                            {markingId === c.id ? "Marking..." : "Mark paid"}
                          </Button>
                        ) : (
                          <span className="text-[12px] text-[color:var(--ink-faint)]">
                            {c.status === "paid"
                              ? formatDateTime(c.paidAt)
                              : c.status === "refunded"
                                ? formatDateTime(c.refundedAt)
                                : c.status === "void"
                                  ? formatDateTime(c.voidedAt)
                                  : "—"}
                          </span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      ) : null}
    </section>
  );
}

function StatChip({
  label,
  count,
  amountCents,
}: {
  label: string;
  count: number;
  amountCents: number;
}) {
  return (
    <div className="rounded-[0.9rem] border border-[color:var(--border)] bg-[color:var(--paper)] px-3 py-2">
      <p className="text-[10px] uppercase tracking-[0.18em] text-[color:var(--ink-faint)]">
        {label}
      </p>
      <p className="mt-1 text-[15px] text-[color:var(--ink)]">
        {count} · ${(amountCents / 100).toFixed(2)}
      </p>
    </div>
  );
}
