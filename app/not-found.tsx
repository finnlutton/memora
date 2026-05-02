import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Page not found · Memora",
  robots: { index: false, follow: false },
};

export default function NotFound() {
  return (
    <main className="min-h-screen bg-[color:var(--background)] px-4 py-12 text-[color:var(--ink)] md:px-6 md:py-16">
      <div className="mx-auto max-w-2xl">
        <p className="text-[10px] uppercase tracking-[0.24em] text-[color:var(--ink-faint)]">
          Memora
        </p>
        <h1 className="mt-2 font-serif text-3xl leading-tight md:mt-3 md:text-5xl">
          We couldn&apos;t find that page
        </h1>
        <p className="mt-4 text-sm leading-6 text-[color:var(--ink-soft)] md:mt-5 md:text-[15px] md:leading-7">
          The link may be old or the page may have moved. From here you can head
          back to the homepage or sign in to your archive.
        </p>
        <div className="mt-8 flex flex-wrap gap-x-6 gap-y-3 text-sm">
          <Link
            href="/"
            className="text-[color:var(--ink)] underline underline-offset-4"
          >
            Return to Memora
          </Link>
          <Link
            href="/auth"
            className="text-[color:var(--ink-soft)] underline underline-offset-4 transition hover:text-[color:var(--ink)]"
          >
            Sign in
          </Link>
        </div>
      </div>
    </main>
  );
}
