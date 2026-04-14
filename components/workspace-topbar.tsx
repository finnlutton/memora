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
        "mb-6 flex flex-col gap-4 border-b border-[rgba(34,52,79,0.08)] pb-5 md:flex-row md:items-end md:justify-between",
        className,
      )}
    >
      <div className="space-y-2">
        {eyebrow ? (
          <p className="text-[10px] uppercase tracking-[0.24em] text-[color:var(--ink-faint)]">{eyebrow}</p>
        ) : null}
        <h1 className="font-serif text-4xl leading-[0.96] text-[color:var(--ink)] md:text-5xl">{title}</h1>
        {subtitle ? (
          <p className="max-w-3xl text-[15px] leading-7 text-[color:var(--ink-soft)]">{subtitle}</p>
        ) : null}
      </div>
      {actions ? <div className="flex flex-wrap items-center gap-2">{actions}</div> : null}
    </header>
  );
}

