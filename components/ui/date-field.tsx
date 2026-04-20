"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { Calendar, ChevronLeft, ChevronRight } from "lucide-react";

type DateFieldProps = {
  value: string; // ISO "YYYY-MM-DD" or ""
  onChange: (next: string) => void;
  placeholder?: string;
  ariaLabel?: string;
  min?: string;
  max?: string;
  className?: string;
};

/* --------------------------- helpers --------------------------- */

function pad2(n: number): string {
  return n < 10 ? `0${n}` : String(n);
}

function parseISO(value: string): Date | null {
  if (!value) return null;
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value.trim());
  if (!match) return null;
  const year = Number(match[1]);
  const month = Number(match[2]) - 1;
  const day = Number(match[3]);
  const date = new Date(year, month, day);
  if (
    date.getFullYear() !== year ||
    date.getMonth() !== month ||
    date.getDate() !== day
  ) {
    return null;
  }
  return date;
}

function toISO(date: Date): string {
  return `${date.getFullYear()}-${pad2(date.getMonth() + 1)}-${pad2(date.getDate())}`;
}

function formatDisplay(value: string): string {
  const date = parseISO(value);
  if (!date) return "";
  return date.toLocaleDateString(undefined, {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}

/** Attempts to parse user-typed text. Accepts ISO, "Feb 11 2026", "2/11/2026", "11 Feb 2026". */
function parseFlexible(text: string): string | null {
  const trimmed = text.trim();
  if (!trimmed) return "";
  const iso = parseISO(trimmed);
  if (iso) return toISO(iso);
  const native = new Date(trimmed);
  if (Number.isNaN(native.getTime())) return null;
  return toISO(native);
}

/* --------------------------- component --------------------------- */

const WEEKDAY_LABELS = ["S", "M", "T", "W", "T", "F", "S"];

export function DateField({
  value,
  onChange,
  placeholder = "Select date",
  ariaLabel,
  min,
  max,
  className,
}: DateFieldProps) {
  const [isCoarsePointer, setIsCoarsePointer] = useState(false);
  const [open, setOpen] = useState(false);
  const [typed, setTyped] = useState<string>(formatDisplay(value));
  const [viewMonth, setViewMonth] = useState<Date>(() => parseISO(value) ?? new Date());
  const wrapRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (typeof window === "undefined" || typeof window.matchMedia !== "function") return;
    const mq = window.matchMedia("(pointer: coarse)");
    setIsCoarsePointer(mq.matches);
    const handler = (event: MediaQueryListEvent) => setIsCoarsePointer(event.matches);
    mq.addEventListener?.("change", handler);
    return () => mq.removeEventListener?.("change", handler);
  }, []);

  useEffect(() => {
    setTyped(formatDisplay(value));
    const parsed = parseISO(value);
    if (parsed) setViewMonth(parsed);
  }, [value]);

  useEffect(() => {
    if (!open) return;
    const onDocClick = (event: MouseEvent) => {
      if (!wrapRef.current) return;
      if (!wrapRef.current.contains(event.target as Node)) setOpen(false);
    };
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") setOpen(false);
    };
    document.addEventListener("mousedown", onDocClick);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onDocClick);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  const monthGrid = useMemo(() => {
    const firstOfMonth = new Date(viewMonth.getFullYear(), viewMonth.getMonth(), 1);
    const startWeekday = firstOfMonth.getDay();
    const gridStart = new Date(firstOfMonth);
    gridStart.setDate(firstOfMonth.getDate() - startWeekday);
    const cells: { date: Date; inMonth: boolean }[] = [];
    for (let i = 0; i < 42; i += 1) {
      const d = new Date(gridStart);
      d.setDate(gridStart.getDate() + i);
      cells.push({ date: d, inMonth: d.getMonth() === viewMonth.getMonth() });
    }
    return cells;
  }, [viewMonth]);

  const monthLabel = viewMonth.toLocaleDateString(undefined, {
    month: "long",
    year: "numeric",
  });

  const selected = parseISO(value);
  const today = new Date();
  const todayISO = toISO(today);

  // Coarse-pointer fallback — use native picker, styled to match our shell.
  if (isCoarsePointer) {
    return (
      <div className={`relative ${className ?? ""}`}>
        <input
          type="date"
          value={value}
          min={min}
          max={max}
          aria-label={ariaLabel}
          onChange={(event) => onChange(event.target.value)}
          className="w-full border-0 border-b-[1.5px] border-[color:var(--border-strong)] bg-transparent px-0 py-3 text-[15px] text-[color:var(--ink)] outline-none transition focus:border-[color:var(--ink)]"
        />
      </div>
    );
  }

  return (
    <div ref={wrapRef} className={`relative ${className ?? ""}`}>
      <div
        className={`group flex cursor-text items-center gap-2 border-b-[1.5px] py-3 transition ${
          open
            ? "border-[color:var(--ink)]"
            : "border-[color:var(--border-strong)] hover:border-[color:var(--ink-soft)] focus-within:border-[color:var(--ink)]"
        }`}
      >
        <input
          type="text"
          value={open ? typed : formatDisplay(value) || typed}
          placeholder={placeholder}
          aria-label={ariaLabel}
          onFocus={() => setOpen(true)}
          onChange={(event) => {
            setTyped(event.target.value);
            const parsed = parseFlexible(event.target.value);
            if (parsed !== null) {
              onChange(parsed);
              if (parsed) {
                const parsedDate = parseISO(parsed);
                if (parsedDate) setViewMonth(parsedDate);
              }
            }
          }}
          onBlur={() => {
            const parsed = parseFlexible(typed);
            if (parsed !== null) onChange(parsed);
            setTyped(formatDisplay(parsed ?? value));
          }}
          className="flex-1 bg-transparent text-[15px] text-[color:var(--ink)] outline-none placeholder:text-[color:var(--ink-faint)]"
        />
        <button
          type="button"
          onClick={() => setOpen((v) => !v)}
          aria-label={open ? "Close date picker" : "Open date picker"}
          className="flex h-7 w-7 items-center justify-center rounded-sm border border-[color:var(--border-strong)] text-[color:var(--ink-soft)] transition hover:border-[color:var(--ink-soft)] hover:bg-[color:var(--paper)] hover:text-[color:var(--ink)]"
        >
          <Calendar className="h-3.5 w-3.5" />
        </button>
      </div>
      <AnimatePresence>
        {open ? (
          <motion.div
            key="date-popover"
            initial={{ opacity: 0, y: -4 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -2, transition: { duration: 0.12 } }}
            transition={{ duration: 0.16, ease: [0.22, 1, 0.36, 1] }}
            className="absolute left-0 z-40 mt-2 w-[18rem] border border-[color:var(--border-strong)] bg-[color:var(--background)] p-3 shadow-[0_14px_38px_rgba(14,22,34,0.16)]"
          >
            <div className="flex items-center justify-between px-1 pb-2">
              <button
                type="button"
                onClick={() =>
                  setViewMonth(
                    new Date(viewMonth.getFullYear(), viewMonth.getMonth() - 1, 1),
                  )
                }
                className="flex h-7 w-7 items-center justify-center rounded-sm border border-[color:var(--border-strong)]/70 text-[color:var(--ink-soft)] transition hover:border-[color:var(--ink-soft)] hover:bg-[color:var(--paper)] hover:text-[color:var(--ink)]"
                aria-label="Previous month"
              >
                <ChevronLeft className="h-4 w-4" />
              </button>
              <p className="text-[14px] font-semibold tracking-[0.01em] text-[color:var(--ink)]">
                {monthLabel}
              </p>
              <button
                type="button"
                onClick={() =>
                  setViewMonth(
                    new Date(viewMonth.getFullYear(), viewMonth.getMonth() + 1, 1),
                  )
                }
                className="flex h-7 w-7 items-center justify-center rounded-sm border border-[color:var(--border-strong)]/70 text-[color:var(--ink-soft)] transition hover:border-[color:var(--ink-soft)] hover:bg-[color:var(--paper)] hover:text-[color:var(--ink)]"
                aria-label="Next month"
              >
                <ChevronRight className="h-4 w-4" />
              </button>
            </div>
            <div className="grid grid-cols-7 gap-0.5 px-1">
              {WEEKDAY_LABELS.map((label, index) => (
                <div
                  key={`${label}-${index}`}
                  className="pb-1 text-center text-[10px] font-semibold uppercase tracking-[0.18em] text-[color:var(--ink-soft)]"
                >
                  {label}
                </div>
              ))}
              {monthGrid.map(({ date, inMonth }) => {
                const iso = toISO(date);
                const isSelected = selected && iso === toISO(selected);
                const isToday = iso === todayISO;
                const disabled =
                  (min && iso < min) || (max && iso > max) || false;
                return (
                  <button
                    key={iso}
                    type="button"
                    disabled={disabled}
                    onClick={() => {
                      onChange(iso);
                      setTyped(formatDisplay(iso));
                      setOpen(false);
                    }}
                    className={`flex h-8 items-center justify-center rounded-sm text-[13.5px] font-medium transition ${
                      disabled
                        ? "cursor-not-allowed text-[color:var(--ink-faint)] opacity-40"
                        : isSelected
                          ? "bg-[color:var(--ink)] text-white"
                          : inMonth
                            ? "text-[color:var(--ink)] hover:bg-[color:var(--paper-strong)]"
                            : "text-[color:var(--ink-faint)] hover:bg-[color:var(--paper)]"
                    } ${isToday && !isSelected ? "ring-1 ring-[color:var(--ink-soft)]" : ""}`}
                  >
                    {date.getDate()}
                  </button>
                );
              })}
            </div>
            <div className="mt-2 flex items-center justify-between border-t border-[color:var(--border-strong)]/50 px-1 pt-2 text-[12px] font-medium">
              <button
                type="button"
                onClick={() => {
                  onChange("");
                  setTyped("");
                  setOpen(false);
                }}
                className="text-[color:var(--ink-soft)] transition hover:text-[color:var(--ink)]"
              >
                Clear
              </button>
              <button
                type="button"
                onClick={() => {
                  onChange(todayISO);
                  setTyped(formatDisplay(todayISO));
                  setViewMonth(today);
                  setOpen(false);
                }}
                className="text-[color:var(--ink-soft)] transition hover:text-[color:var(--ink)]"
              >
                Today
              </button>
            </div>
          </motion.div>
        ) : null}
      </AnimatePresence>
    </div>
  );
}
