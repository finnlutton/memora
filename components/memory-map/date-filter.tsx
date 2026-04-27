"use client";

import { CalendarRange, ChevronDown } from "lucide-react";
import { useEffect, useRef, useState } from "react";

/**
 * Sleek date-filter control for the Memory Map page.
 *
 * Three modes — All time, Specific year, Custom date range — packed
 * into one compact pill with a popover. Designed to sit alongside the
 * Globe / U.S.A. view toggle without competing visually with it. The
 * popover is rendered with a simple absolute-positioned panel and a
 * window-level mousedown listener for outside-click dismissal — no new
 * dependency.
 */

export type DateFilter =
  | { kind: "all" }
  | { kind: "year"; year: number }
  | { kind: "range"; start: string; end: string };

function formatYearMonth(iso: string): string {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return iso;
  return date.toLocaleDateString("en-US", { month: "short", year: "numeric" });
}

export function describeFilter(filter: DateFilter): string {
  if (filter.kind === "all") return "All time";
  if (filter.kind === "year") return `${filter.year}`;
  // For a clean summary we surface the month/year of each endpoint;
  // when start and end fall in the same month we collapse to one.
  const startLabel = formatYearMonth(filter.start);
  const endLabel = formatYearMonth(filter.end);
  if (startLabel === endLabel) return startLabel;
  return `${startLabel} – ${endLabel}`;
}

export function describeFilterSummary(filter: DateFilter): string {
  if (filter.kind === "all") return "Showing all memories";
  if (filter.kind === "year") return `Showing ${filter.year}`;
  return `Showing ${describeFilter(filter)}`;
}

export function MemoryMapDateFilter({
  filter,
  onChange,
  availableYears,
}: {
  filter: DateFilter;
  onChange: (next: DateFilter) => void;
  availableYears: number[];
}) {
  const [open, setOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (!open) return;
    const onPointerDown = (e: MouseEvent) => {
      if (!containerRef.current?.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    window.addEventListener("mousedown", onPointerDown);
    window.addEventListener("keydown", onKey);
    return () => {
      window.removeEventListener("mousedown", onPointerDown);
      window.removeEventListener("keydown", onKey);
    };
  }, [open]);

  const choose = (next: DateFilter) => {
    onChange(next);
    setOpen(false);
  };

  return (
    <div ref={containerRef} className="relative">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        aria-haspopup="dialog"
        aria-expanded={open}
        className="inline-flex items-center gap-2 border border-[color:var(--border-strong)] bg-[rgba(250,252,255,0.94)] px-3.5 py-1.5 text-[10.5px] font-medium uppercase tracking-[0.22em] text-[color:var(--ink)] shadow-[0_6px_18px_rgba(14,22,34,0.08)] backdrop-blur-sm transition hover:bg-[rgba(255,255,255,0.98)] md:px-4 md:py-2 md:text-[11px]"
      >
        <CalendarRange className="h-3.5 w-3.5" strokeWidth={1.6} />
        <span className="whitespace-nowrap normal-case tracking-[0.05em] text-[12px] md:text-[12.5px]">
          {describeFilter(filter)}
        </span>
        <ChevronDown
          className={`h-3 w-3 transition-transform ${open ? "rotate-180" : ""}`}
          strokeWidth={2}
        />
      </button>

      {open ? (
        <FilterPopover
          filter={filter}
          availableYears={availableYears}
          onChoose={choose}
        />
      ) : null}
    </div>
  );
}

/**
 * Popover content. Mounted fresh each time the dropdown opens; the
 * draft range state is initialized from the active filter on mount,
 * which avoids the setState-in-effect pattern.
 */
function FilterPopover({
  filter,
  availableYears,
  onChoose,
}: {
  filter: DateFilter;
  availableYears: number[];
  onChoose: (next: DateFilter) => void;
}) {
  const [draftStart, setDraftStart] = useState<string>(
    filter.kind === "range" ? filter.start : "",
  );
  const [draftEnd, setDraftEnd] = useState<string>(
    filter.kind === "range" ? filter.end : "",
  );

  const applyRange = () => {
    if (!draftStart || !draftEnd) return;
    const a = draftStart <= draftEnd ? draftStart : draftEnd;
    const b = draftStart <= draftEnd ? draftEnd : draftStart;
    onChoose({ kind: "range", start: a, end: b });
  };

  return (
    <div
      role="dialog"
      aria-label="Filter by date"
      className="absolute right-0 top-[calc(100%+0.5rem)] z-30 w-72 border border-[color:var(--border-strong)] bg-white p-3 shadow-[0_18px_36px_-12px_rgba(14,22,34,0.22)] md:w-80 md:p-4"
    >
      <button
        type="button"
        onClick={() => onChoose({ kind: "all" })}
        className={`flex w-full items-center justify-between px-2 py-2 text-[12.5px] transition ${
          filter.kind === "all"
            ? "bg-[color:var(--paper)] text-[color:var(--ink)]"
            : "text-[color:var(--ink-soft)] hover:bg-[color:var(--hover-tint)] hover:text-[color:var(--ink)]"
        }`}
      >
        <span>All time</span>
        {filter.kind === "all" ? (
          <span className="text-[10px] uppercase tracking-[0.18em] text-[color:var(--ink-faint)]">
            Current
          </span>
        ) : null}
      </button>

      {availableYears.length > 0 ? (
        <>
          <p className="mt-3 px-2 text-[9.5px] font-medium uppercase tracking-[0.26em] text-[color:var(--ink-faint)]">
            By year
          </p>
          <div className="mt-1 grid grid-cols-3 gap-1">
            {availableYears.map((year) => {
              const selected =
                filter.kind === "year" && filter.year === year;
              return (
                <button
                  key={year}
                  type="button"
                  onClick={() => onChoose({ kind: "year", year })}
                  className={`px-2 py-1.5 text-[12.5px] transition ${
                    selected
                      ? "bg-[color:var(--ink)] text-white"
                      : "border border-transparent text-[color:var(--ink-soft)] hover:border-[color:var(--border)] hover:text-[color:var(--ink)]"
                  }`}
                >
                  {year}
                </button>
              );
            })}
          </div>
        </>
      ) : null}

      <p className="mt-3 px-2 text-[9.5px] font-medium uppercase tracking-[0.26em] text-[color:var(--ink-faint)]">
        Custom range
      </p>
      <div className="mt-1 grid grid-cols-2 gap-2 px-2">
        <label className="block">
          <span className="block text-[10px] uppercase tracking-[0.2em] text-[color:var(--ink-faint)]">
            From
          </span>
          <input
            type="date"
            value={draftStart}
            onChange={(e) => setDraftStart(e.target.value)}
            className="mt-1 w-full border border-[color:var(--border-strong)] bg-white px-2 py-1.5 text-[12px] text-[color:var(--ink)] outline-none focus:border-[color:var(--ink-soft)]"
          />
        </label>
        <label className="block">
          <span className="block text-[10px] uppercase tracking-[0.2em] text-[color:var(--ink-faint)]">
            To
          </span>
          <input
            type="date"
            value={draftEnd}
            onChange={(e) => setDraftEnd(e.target.value)}
            className="mt-1 w-full border border-[color:var(--border-strong)] bg-white px-2 py-1.5 text-[12px] text-[color:var(--ink)] outline-none focus:border-[color:var(--ink-soft)]"
          />
        </label>
      </div>
      <div className="mt-3 flex justify-end px-2">
        <button
          type="button"
          onClick={applyRange}
          disabled={!draftStart || !draftEnd}
          className="inline-flex items-center justify-center bg-[color:var(--ink)] px-3 py-1.5 text-[10.5px] font-semibold uppercase tracking-[0.18em] text-white transition hover:bg-[color:var(--ink-soft)] disabled:cursor-not-allowed disabled:opacity-50"
        >
          Apply
        </button>
      </div>

      {filter.kind !== "all" ? (
        <div className="mt-3 border-t border-[color:var(--border)] pt-2">
          <button
            type="button"
            onClick={() => onChoose({ kind: "all" })}
            className="w-full px-2 py-1.5 text-left text-[11px] font-medium uppercase tracking-[0.2em] text-[color:var(--ink-soft)] transition hover:text-[color:var(--ink)]"
          >
            Reset filter
          </button>
        </div>
      ) : null}
    </div>
  );
}
