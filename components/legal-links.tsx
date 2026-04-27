import Link from "next/link";

/**
 * Subtle legal links — used in auth, settings, pricing, share footers.
 *
 * Two variants:
 *   - "subtle" (default): inline text with underline-on-hover, designed
 *     to sit quietly in a footer or below a CTA without drawing
 *     attention.
 *   - "agree": full sentence form for the create-account button context.
 *
 * Pass `returnTo` (e.g. "/auth?mode=signup") to forward the source path
 * to the legal pages, so their "Back" link can return the user there
 * instead of the marketing home.
 */

function withReturn(href: string, returnTo: string | undefined) {
  if (!returnTo) return href;
  return `${href}?return=${encodeURIComponent(returnTo)}`;
}

export function LegalLinks({
  variant = "subtle",
  className,
  returnTo,
}: {
  variant?: "subtle" | "agree";
  className?: string;
  returnTo?: string;
}) {
  const termsHref = withReturn("/terms", returnTo);
  const privacyHref = withReturn("/privacy", returnTo);

  if (variant === "agree") {
    return (
      <p
        className={
          className ??
          "text-[11px] leading-5 text-[color:var(--ink-soft)] md:text-[12px]"
        }
      >
        By creating an account, you agree to Memora&apos;s{" "}
        <Link
          href={termsHref}
          className="text-[color:var(--ink)] underline decoration-[color:var(--ink-faint)] underline-offset-[3px] transition hover:decoration-[color:var(--ink-soft)]"
        >
          Terms of Service
        </Link>{" "}
        and acknowledge our{" "}
        <Link
          href={privacyHref}
          className="text-[color:var(--ink)] underline decoration-[color:var(--ink-faint)] underline-offset-[3px] transition hover:decoration-[color:var(--ink-soft)]"
        >
          Privacy Policy
        </Link>
        .
      </p>
    );
  }

  return (
    <p
      className={
        className ??
        "text-[10.5px] uppercase tracking-[0.18em] text-[color:var(--ink-faint)]"
      }
    >
      <Link
        href={termsHref}
        className="transition hover:text-[color:var(--ink-soft)]"
      >
        Terms
      </Link>
      <span aria-hidden className="mx-2 opacity-60">
        ·
      </span>
      <Link
        href={privacyHref}
        className="transition hover:text-[color:var(--ink-soft)]"
      >
        Privacy
      </Link>
    </p>
  );
}
