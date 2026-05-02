"use client";

import { useEffect } from "react";
import Link from "next/link";

// Per-segment error boundary. Caught errors stop propagation here so the
// root layout (theme script, providers) keeps rendering. We never expose
// the raw error message to the user — it only goes to the console for
// devtools / Sentry forwarding once that's wired up.
export default function GlobalRouteError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error("Memora: route error boundary", error);
  }, [error]);

  return (
    <main className="min-h-screen bg-[color:var(--background)] px-4 py-12 text-[color:var(--ink)] md:px-6 md:py-16">
      <div className="mx-auto max-w-2xl">
        <p className="text-[10px] uppercase tracking-[0.24em] text-[color:var(--ink-faint)]">
          Memora
        </p>
        <h1 className="mt-2 font-serif text-3xl leading-tight md:mt-3 md:text-5xl">
          Something went wrong
        </h1>
        <p className="mt-4 text-sm leading-6 text-[color:var(--ink-soft)] md:mt-5 md:text-[15px] md:leading-7">
          We hit an unexpected error loading this page. You can try again, or
          head back to the homepage if it keeps happening.
        </p>
        <div className="mt-8 flex flex-wrap gap-x-6 gap-y-3 text-sm">
          <button
            type="button"
            onClick={reset}
            className="text-[color:var(--ink)] underline underline-offset-4"
          >
            Try again
          </button>
          <Link
            href="/"
            className="text-[color:var(--ink-soft)] underline underline-offset-4 transition hover:text-[color:var(--ink)]"
          >
            Return to Memora
          </Link>
        </div>
        {error.digest ? (
          <p className="mt-10 font-[family-name:var(--font-mono)] text-[10.5px] uppercase tracking-[0.16em] text-[color:var(--ink-faint)]">
            Reference: {error.digest}
          </p>
        ) : null}
      </div>
    </main>
  );
}
