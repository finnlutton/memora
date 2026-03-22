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
          "inline-flex items-center justify-center gap-2 rounded-full px-4 py-2.5 text-sm font-medium transition duration-300 ease-out focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[color:var(--accent-strong)]/40 disabled:pointer-events-none disabled:opacity-60",
          variant === "primary" &&
            "bg-[color:var(--accent-strong)] text-white shadow-[0_18px_50px_rgba(47,73,109,0.24)] hover:-translate-y-0.5 hover:bg-[color:var(--accent)] active:translate-y-0",
          variant === "secondary" &&
            "border border-[color:var(--border-strong)] bg-white/80 text-[color:var(--ink)] backdrop-blur hover:border-[color:var(--accent)] hover:bg-[color:var(--paper)]",
          variant === "ghost" &&
            "bg-transparent text-[color:var(--ink-soft)] hover:bg-white/70 hover:text-[color:var(--ink)]",
          variant === "danger" &&
            "bg-[#8b4c4c] text-white shadow-[0_16px_44px_rgba(139,76,76,0.22)] hover:bg-[#7b3f3f]",
          className,
        )}
        {...props}
      />
    );
  },
);

Button.displayName = "Button";
