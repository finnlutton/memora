"use client";

import { cn } from "@/lib/utils";

export function WorkspaceTopbar({
  eyebrow,
  title,
  subtitle,
  actions,
  className,
  actionsClassName,
  titleClassName,
  hideTitleOnMobile = false,
  showSubtitleOnMobile = false,
}: {
  eyebrow?: string;
  title: string;
  subtitle?: string;
  actions?: React.ReactNode;
  className?: string;
  /**
   * Extra classes appended to the actions container. Useful when a
   * specific page wants a non-default action layout — e.g. the
   * galleries dashboard stacks its actions vertically on desktop and
   * vertically centers them against the title.
   */
  actionsClassName?: string;
  /**
   * Extra classes appended to the title element. Lets a page bump the
   * mobile title size without touching the global default used by every
   * other workspace page.
   */
  titleClassName?: string;
  /**
   * Hide the page title on mobile only. Useful when the active nav strip
   * already names the page (e.g. galleries dashboard) and the giant serif
   * title becomes redundant clutter at small widths.
   */
  hideTitleOnMobile?: boolean;
  /**
   * Show the subtitle on mobile too. Default behavior keeps it desktop-only
   * to save vertical real estate, but pages that re-create the desktop
   * editorial header on mobile (e.g. the galleries dashboard) want it.
   */
  showSubtitleOnMobile?: boolean;
}) {
  return (
    <header
      className={cn(
        // No border-b divider: the title is part of the page, not a headband over it.
        // md:items-start keeps actions anchored to the top-right while the serif
        // title is free to grow downward (matches the Memory Map masthead rhythm).
        // When the title is hidden on mobile we collapse to a single row so the
        // eyebrow sits top-left and the actions sit top-right, side by side.
        hideTitleOnMobile
          ? "mb-6 flex flex-row items-center justify-between gap-3 md:mb-12 md:items-start md:gap-6"
          : "mb-6 flex flex-col gap-3 md:mb-12 md:flex-row md:items-start md:justify-between md:gap-6",
        className,
      )}
    >
      <div className="min-w-0">
        {eyebrow ? (
          <p className="text-[10px] font-medium uppercase tracking-[0.24em] text-[color:var(--ink-soft)]">
            {eyebrow}
          </p>
        ) : null}
        <h1
          className={cn(
            "mt-1.5 font-serif text-[28px] leading-[1] text-[color:var(--ink)] md:mt-3 md:text-[64px] md:leading-[0.94]",
            hideTitleOnMobile && "hidden md:block",
            titleClassName,
          )}
        >
          {title}
        </h1>
        {subtitle ? (
          <p
            className={cn(
              "max-w-[520px] border-l border-[color:var(--border-strong)] pl-3.5 font-serif text-[14px] italic leading-[1.6] text-[color:var(--ink-soft)] md:mt-6 md:text-[17px] md:leading-[1.7]",
              showSubtitleOnMobile ? "mt-4 block" : "hidden md:block",
            )}
          >
            {subtitle}
          </p>
        ) : null}
      </div>
      {actions ? (
        <div
          className={cn(
            "flex flex-wrap items-center justify-end gap-1.5 md:gap-2 md:pt-2",
            actionsClassName,
          )}
        >
          {actions}
        </div>
      ) : null}
    </header>
  );
}

