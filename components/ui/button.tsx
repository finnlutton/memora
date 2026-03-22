import * as React from "react";
import { Slot } from "@radix-ui/react-slot";
import { cn } from "@/lib/utils";

type ButtonProps = React.ButtonHTMLAttributes<HTMLButtonElement> & {
  asChild?: boolean;
  variant?: "primary" | "secondary" | "ghost" | "danger";
};

export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ asChild = false, className, variant = "primary", ...props }, ref) => {
    const Component = asChild ? Slot : "button";
    return (
      <Component
        ref={ref}
        className={cn(
          "inline-flex items-center justify-center gap-2 rounded-sm px-4 py-2.5 text-sm font-medium uppercase tracking-[0.16em] transition duration-200 ease-out focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[color:var(--accent-strong)]/35 disabled:pointer-events-none disabled:opacity-60",
          variant === "primary" &&
            "bg-[color:var(--accent-strong)] text-white shadow-none hover:bg-[#22314a] active:translate-y-0",
          variant === "secondary" &&
            "border border-[color:var(--border-strong)] bg-[rgba(255,255,255,0.82)] text-[color:var(--ink)] backdrop-blur hover:border-[color:var(--accent-strong)] hover:bg-[color:var(--paper)]",
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
