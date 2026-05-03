import * as React from "react";
import { Slot } from "@radix-ui/react-slot";
import { cn } from "@/lib/utils";

type ButtonProps = React.ButtonHTMLAttributes<HTMLButtonElement> & {
  asChild?: boolean;
  variant?: "primary" | "secondary" | "ghost" | "danger";
  /**
   * Size variants. Default `sm` preserves the historical compact rhythm
   * used across the editorial layouts. `touch` enforces a 44px minimum
   * tap target for mobile-primary actions; `icon` is a 44×44 square for
   * icon-only buttons (close, prev/next, etc.) so they meet WCAG 2.5.5
   * without padding the visual weight of the icon itself.
   */
  size?: "sm" | "touch" | "icon";
};

export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  (
    { asChild = false, className, variant = "primary", size = "sm", ...props },
    ref,
  ) => {
    const Component = asChild ? Slot : "button";
    return (
      <Component
        ref={ref}
        className={cn(
          "inline-flex items-center justify-center gap-1.5 rounded-full font-medium uppercase tracking-[0.16em] transition duration-200 ease-out focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[color:var(--accent-strong)]/35 disabled:pointer-events-none disabled:opacity-60",
          size === "sm" && "px-3.5 py-2 text-[11px]",
          size === "touch" && "min-h-11 px-4 py-2.5 text-[12px]",
          size === "icon" && "h-11 w-11 p-0 text-[11px]",
          variant === "primary" &&
            "bg-[color:var(--accent-strong)] text-[color:var(--background)] shadow-none hover:bg-[color:var(--accent-strong-hover)] active:translate-y-0",
          variant === "secondary" &&
            "border border-[color:var(--border-strong)] bg-transparent text-[color:var(--ink)] hover:border-[color:var(--accent-strong)] hover:bg-[color:var(--paper)]",
          variant === "ghost" &&
            "bg-transparent text-[color:var(--ink-soft)] hover:bg-[rgba(22,35,56,0.04)] hover:text-[color:var(--ink)]",
          variant === "danger" &&
            "bg-[#7f2f39] text-white shadow-none hover:bg-[#67232d]",
          className,
        )}
        {...props}
      />
    );
  },
);

Button.displayName = "Button";
