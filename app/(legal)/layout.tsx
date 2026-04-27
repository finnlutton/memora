import Image from "next/image";
import Link from "next/link";
import { Suspense } from "react";
import { LegalBackLink } from "@/components/legal-back-link";
import memoraLogo from "../../Logo/MemoraLogo.png";

/**
 * Legal-pages layout — quiet editorial reading surface for the Privacy
 * Policy and Terms of Service. Intentionally outside AppShell so the
 * pages render even on slow/auth-failure paths and don't carry the
 * dashboard chrome.
 */
export default function LegalLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen bg-[color:var(--background)]">
      <header className="border-b border-[color:var(--border)] bg-[color:var(--chrome)]/90 backdrop-blur-sm">
        <div className="mx-auto flex h-14 w-full max-w-3xl items-center justify-between px-5 md:h-[64px]">
          <Link
            href="/"
            className="inline-flex items-center"
            aria-label="Memora home"
          >
            <Image
              src={memoraLogo}
              alt="Memora"
              priority
              sizes="160px"
              className="h-[110px] w-auto object-contain object-left md:h-[140px]"
            />
          </Link>
          {/*
            Smart back link — uses ?return=... from the URL when present
            (e.g. coming from /auth) so users land back on the page they
            came from, not the marketing home. Suspense boundary required
            because useSearchParams reads from the request.
          */}
          <Suspense
            fallback={
              <Link
                href="/"
                className="text-[11px] font-medium uppercase tracking-[0.2em] text-[color:var(--ink-soft)]"
              >
                Back to Memora
              </Link>
            }
          >
            <LegalBackLink />
          </Suspense>
        </div>
      </header>
      <main className="mx-auto w-full max-w-3xl px-5 py-12 md:py-20">
        {children}
      </main>
      <footer className="mx-auto w-full max-w-3xl px-5 pb-12 pt-6 text-[11px] text-[color:var(--ink-faint)]">
        <p>
          <Link
            href="/privacy"
            className="underline-offset-2 hover:text-[color:var(--ink-soft)] hover:underline"
          >
            Privacy
          </Link>
          <span className="mx-2 opacity-60">·</span>
          <Link
            href="/terms"
            className="underline-offset-2 hover:text-[color:var(--ink-soft)] hover:underline"
          >
            Terms
          </Link>
        </p>
      </footer>
    </div>
  );
}
