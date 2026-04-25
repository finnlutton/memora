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
        // No border-b divider: the title is part of the page, not a headband over it.
        // md:items-start keeps actions anchored to the top-right while the serif
        // title is free to grow downward (matches the Memory Map masthead rhythm).
        "mb-8 flex flex-col gap-4 md:mb-12 md:flex-row md:items-start md:justify-between md:gap-6",
        className,
      )}
    >
      <div className="min-w-0">
        {eyebrow ? (
          <p className="text-[10px] font-medium uppercase tracking-[0.24em] text-[color:var(--ink-soft)]">
            {eyebrow}
          </p>
        ) : null}
        <h1 className="mt-2 font-serif text-[40px] leading-[0.94] text-[color:var(--ink)] md:mt-3 md:text-[64px]">
          {title}
        </h1>
        {subtitle ? (
          <p className="mt-5 max-w-4xl border-l-2 border-[color:var(--border-strong)] pl-4 text-[14px] leading-[1.65] text-[color:var(--ink)] md:mt-6 md:pl-5 md:text-[15.5px] md:leading-[1.7]">
            {subtitle}
          </p>
        ) : null}
      </div>
      {actions ? (
        <div className="flex flex-wrap items-center gap-2 md:pt-2">{actions}</div>
      ) : null}
    </header>
  );
}

