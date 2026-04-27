"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";

/**
 * Smart "Back" link for legal pages.
 *
 * Reads `?return=<path>` from the URL and links there if it's a valid
 * same-origin app path. Falls back to "/" if the param is missing or
 * unsafe (anything not starting with a single "/" is rejected, so
 * external URLs and protocol-relative URLs are blocked).
 *
 * Label adapts so the user knows where they're going:
 *   /auth?mode=signup → "Back to sign up"
 *   /auth?mode=signin → "Back to sign in"
 *   /auth (no mode)   → "Back to sign in"
 *   anything else     → "Back to Memora"
 */
function isSafeReturnPath(value: string | null): value is string {
  if (!value) return false;
  // Must start with a single "/" (so neither "//evil.com" nor an
  // absolute URL slips through). Limit length to avoid weird input.
  return value.length > 0 && value.length < 200 && value.startsWith("/") && !value.startsWith("//");
}

function labelFor(path: string): string {
  if (path.startsWith("/auth")) {
    if (path.includes("mode=signup")) return "Back to sign up";
    return "Back to sign in";
  }
  return "Back to Memora";
}

export function LegalBackLink({
  className,
}: {
  className?: string;
}) {
  const params = useSearchParams();
  const requested = params.get("return");
  const target = isSafeReturnPath(requested) ? requested : "/";
  return (
    <Link
      href={target}
      className={
        className ??
        "text-[11px] font-medium uppercase tracking-[0.2em] text-[color:var(--ink-soft)] transition hover:text-[color:var(--ink)]"
      }
    >
      {labelFor(target)}
    </Link>
  );
}
