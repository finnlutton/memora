"use client";

import { cn } from "@/lib/utils";

export function WorkspaceTopbar({
  eyebrow,
  title,
  subtitle,
  actions,
  className,
}: {
  eyebrow?: string;
  title: string;
  subtitle?: string;
  actions?: React.ReactNode;
  className?: string;
}) {
  return (
    <header
      className={cn(
        "mb-4 flex flex-col gap-3 border-b border-[color:var(--border)] pb-4 md:mb-6 md:gap-4 md:pb-5 md:flex-row md:items-end md:justify-between",
        className,
      )}
    >
      <div className="space-y-2">
        {eyebrow ? (
          <p className="text-[10px] uppercase tracking-[0.24em] text-[color:var(--ink-faint)]">{eyebrow}</p>
        ) : null}
        <h1 className="font-serif text-3xl leading-[0.96] text-[color:var(--ink)] md:text-5xl">{title}</h1>
        {subtitle ? (
          <p className="max-w-3xl text-sm leading-6 text-[color:var(--ink-soft)] md:text-[15px] md:leading-7">{subtitle}</p>
        ) : null}
      </div>
      {actions ? <div className="flex flex-wrap items-center gap-2">{actions}</div> : null}
    </header>
  );
}

