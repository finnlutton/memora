import Link from "next/link";

/**
 * Quiet editorial footer for public marketing routes.
 *
 * Single row: small uppercase wordmark, then Pricing · Terms · Privacy
 * in tracking-wide faint type. Sits below the page's closing beat
 * (photograph, hero, etc.) on a calm paper background so it doesn't
 * compete with the closing image. Intentionally minimal — no nav, no
 * social icons.
 */
export function SiteFooter() {
  const year = new Date().getFullYear();
  return (
    <footer className="border-t border-[color:var(--border)] bg-[color:var(--background)] px-4 py-8 md:py-10">
      <div className="mx-auto flex max-w-5xl flex-col items-center gap-3 text-center md:flex-row md:justify-between md:gap-0 md:text-left">
        <p className="text-[10px] uppercase tracking-[0.24em] text-[color:var(--ink-faint)]">
          © {year} Memora
        </p>
        <p className="text-[10px] uppercase tracking-[0.18em] text-[color:var(--ink-faint)]">
          <Link
            href="/pricing"
            className="transition hover:text-[color:var(--ink-soft)]"
          >
            Pricing
          </Link>
          <span aria-hidden className="mx-2 opacity-60">
            ·
          </span>
          <Link
            href="/terms"
            className="transition hover:text-[color:var(--ink-soft)]"
          >
            Terms
          </Link>
          <span aria-hidden className="mx-2 opacity-60">
            ·
          </span>
          <Link
            href="/privacy"
            className="transition hover:text-[color:var(--ink-soft)]"
          >
            Privacy
          </Link>
        </p>
      </div>
    </footer>
  );
}
