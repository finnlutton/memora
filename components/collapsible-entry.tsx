"use client";

import { ChevronDown } from "lucide-react";
import { useState } from "react";
import { cn } from "@/lib/utils";

/**
 * Editorial entry block — long descriptions are tucked behind a "Read entry"
 * button so the page rhythm stays scannable. Mono meta on the trigger shows
 * word count and an estimated read time so the reader can decide before
 * expanding.
 */
export function CollapsibleEntry({
  text,
  className,
  label = "Read entry",
  defaultOpen = false,
}: {
  text: string;
  className?: string;
  label?: string;
  defaultOpen?: boolean;
}) {
  const [open, setOpen] = useState(defaultOpen);
  const trimmed = text?.trim() ?? "";
  if (!trimmed) return null;

  const words = trimmed.split(/\s+/).filter(Boolean).length;
  const minutes = Math.max(1, Math.round(words / 220));
  const meta = `${words} words · ~${minutes} min`;

  return (
    <div className={cn("space-y-3", className)}>
      <button
        type="button"
        onClick={() => setOpen((current) => !current)}
        aria-expanded={open}
        className="group inline-flex items-center gap-2 font-[family-name:var(--font-mono)] text-[10.5px] uppercase tracking-[0.18em] text-[color:var(--ink-soft)] transition hover:text-[color:var(--ink)]"
      >
        <ChevronDown
          aria-hidden="true"
          className={cn(
            "h-3 w-3 transition-transform",
            open ? "rotate-180" : "rotate-0",
          )}
          strokeWidth={1.6}
        />
        <span>{open ? "Hide entry" : label}</span>
        <span className="text-[color:var(--ink-faint)]">· {meta}</span>
      </button>
      {open ? (
        <p className="whitespace-pre-line font-serif text-[15px] leading-[1.7] text-[color:var(--ink)] md:text-[16.5px] md:leading-[1.75]">
          {trimmed}
        </p>
      ) : null}
    </div>
  );
}
