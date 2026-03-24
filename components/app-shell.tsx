"use client";

import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";

export function AppShell({
  children,
  accent = "default",
}: {
  children: React.ReactNode;
  accent?: "default" | "immersive";
}) {
  const pathname = usePathname();
  const isHomePage = pathname === "/";

  return (
    <div
      className={cn(
        "relative min-h-screen overflow-x-hidden",
        accent === "immersive" &&
          "bg-[radial-gradient(circle_at_top_left,rgba(217,228,240,0.68),transparent_30%),var(--background)]",
      )}
    >
      <div className="pointer-events-none absolute inset-x-0 top-0 h-[14rem] bg-[linear-gradient(180deg,rgba(221,231,243,0.34),transparent)]" />
      <header className="sticky top-0 z-30 overflow-visible border-b border-[color:var(--border)] bg-[rgba(250,252,255,0.96)] backdrop-blur-xl">
        <div className="mx-auto flex h-[76px] w-full max-w-7xl items-center justify-between gap-3 overflow-visible px-4 py-1.5 md:h-[88px] md:gap-5 md:px-6 md:py-0">
          <Link
            href="/"
            className="flex h-[68px] min-w-0 shrink items-center overflow-visible md:h-[86px]"
            aria-label="Memora home"
          >
            <Image
              src="/memora-logo.png"
              alt="Memora"
              width={1040}
              height={240}
              priority
              sizes="(max-width: 640px) 78vw, (max-width: 1024px) 90vw, 1200px"
              className="h-full w-auto origin-left scale-[1.18] object-contain object-left will-change-transform md:scale-[1.85] lg:scale-[1.98]"
            />
          </Link>
          <nav className="flex shrink-0 items-center gap-0.5 md:gap-1">
            <NavLink href="/galleries">Gallery</NavLink>
            <Button
              asChild
              variant="primary"
              className="ml-2 border border-[color:var(--accent-strong)]/20 px-3.5 py-2 text-[11px] tracking-[0.18em] shadow-[inset_0_1px_0_rgba(255,255,255,0.08)] md:ml-3"
            >
              <Link href="/auth">Create</Link>
            </Button>
          </nav>
        </div>
      </header>
      <main className="relative z-10 mx-auto w-full max-w-7xl px-4 py-5 md:px-6 md:py-6">
        {children}
      </main>
      {isHomePage && (
        <footer className="mx-auto mt-8 w-full max-w-7xl px-4 pb-6 md:px-6">
          <ContactUsBox />
        </footer>
      )}
    </div>
  );
}

function ContactUsBox() {
  const [message, setMessage] = useState("");
  return (
    <div className="border-t border-[color:var(--border)] pt-6">
      <div className="border border-[color:var(--border)] bg-[rgba(245,248,252,0.96)] p-4 md:p-5">
        <p className="text-[10px] uppercase tracking-[0.28em] text-[color:var(--ink-faint)]">
          Contact
        </p>
        <h3 className="mt-2 font-serif text-xl leading-tight text-[color:var(--ink)] md:text-2xl">
          Get in touch
        </h3>
        <p className="mt-2 text-xs leading-6 text-[color:var(--ink-soft)]">
          Questions or feedback? Reach us at{" "}
          <a
            href="mailto:hello@memora.app"
            className="text-[color:var(--ink)] underline decoration-[color:var(--ink-soft)] underline-offset-2 transition hover:decoration-[color:var(--accent-strong)]"
          >
            hello@memora.app
          </a>
        </p>
        <div className="mt-4 flex flex-col gap-2 sm:flex-row sm:items-end sm:gap-3">
          <input
            type="text"
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            placeholder="Leave a message..."
            className="min-w-0 flex-1 rounded border border-[color:var(--border)] bg-white px-3 py-2 text-xs text-[color:var(--ink)] placeholder:text-[color:var(--ink-faint)] focus:outline-none focus:ring-2 focus:ring-[color:var(--accent)]"
          />
          <Button type="button" className="shrink-0 px-3 py-2 text-[11px]">
            Send
          </Button>
        </div>
      </div>
    </div>
  );
}

function NavLink({ href, children }: { href: string; children: React.ReactNode }) {
  return (
    <Link
      href={href}
      className="px-2.5 py-2 text-[11px] font-medium uppercase tracking-[0.18em] text-[color:var(--ink-soft)] transition hover:text-[color:var(--ink)]"
    >
      {children}
    </Link>
  );
}
