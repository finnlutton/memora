"use client";

import { useState } from "react";
import Link from "next/link";
import { Camera } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";

export function AppShell({
  children,
  accent = "default",
}: {
  children: React.ReactNode;
  accent?: "default" | "immersive";
}) {
  return (
    <div
      className={cn(
        "relative min-h-screen overflow-hidden",
        accent === "immersive" &&
          "bg-[radial-gradient(circle_at_top_left,rgba(217,228,240,0.68),transparent_30%),var(--background)]",
      )}
    >
      <div className="pointer-events-none absolute inset-x-0 top-0 h-[22rem] bg-[linear-gradient(180deg,rgba(221,231,243,0.34),transparent)]" />
      <header className="sticky top-0 z-30 border-b border-[color:var(--border)] bg-[rgba(248,251,255,0.86)] backdrop-blur-xl">
        <div className="mx-auto flex w-full max-w-7xl flex-col gap-4 px-5 py-4 md:px-8 lg:flex-row lg:items-center lg:justify-between">
          <Link href="/" className="flex items-center gap-3">
            <span className="flex h-10 w-10 items-center justify-center border border-[color:var(--border-strong)] bg-white text-[color:var(--accent-strong)]">
              <Camera className="h-4 w-4" />
            </span>
            <span>
              <span className="block font-serif text-xl leading-none tracking-[0.12em] text-[color:var(--ink)]">
                Memora
              </span>
              <span className="mt-1 block text-[10px] uppercase tracking-[0.28em] text-[color:var(--ink-faint)]">
                Memory Archive
              </span>
            </span>
          </Link>
          <nav className="flex w-full flex-wrap items-center gap-1 border border-[color:var(--border)] bg-[rgba(255,255,255,0.8)] p-1 lg:w-auto">
            <NavLink href="/">Home</NavLink>
            <NavLink href="/galleries">Galleries</NavLink>
            <NavLink href="/galleries/new">Demo</NavLink>
          </nav>
        </div>
      </header>
      <main className="relative z-10 mx-auto w-full max-w-7xl px-5 py-8 md:px-8 md:py-10">
        {children}
      </main>
      <footer className="mx-auto mt-12 w-full max-w-7xl px-5 pb-10 md:px-8">
        <ContactUsBox />
      </footer>
    </div>
  );
}

function ContactUsBox() {
  const [message, setMessage] = useState("");
  return (
    <div className="border-t border-[color:var(--border)] pt-10">
      <div className="border border-[color:var(--border)] bg-[rgba(245,248,252,0.96)] p-6 md:p-8">
        <p className="text-[11px] uppercase tracking-[0.28em] text-[color:var(--ink-faint)]">
          Contact
        </p>
        <h3 className="mt-4 font-serif text-3xl leading-tight text-[color:var(--ink)] md:text-4xl">
          Get in touch
        </h3>
        <p className="mt-4 text-sm leading-7 text-[color:var(--ink-soft)]">
          Questions or feedback? Reach us at{" "}
          <a
            href="mailto:hello@memora.app"
            className="text-[color:var(--ink)] underline decoration-[color:var(--ink-soft)] underline-offset-2 transition hover:decoration-[color:var(--accent-strong)]"
          >
            hello@memora.app
          </a>
        </p>
        <div className="mt-6 flex flex-col gap-3 sm:flex-row sm:items-end sm:gap-4">
          <input
            type="text"
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            placeholder="Leave a message..."
            className="min-w-0 flex-1 rounded border border-[color:var(--border)] bg-white px-4 py-3 text-sm text-[color:var(--ink)] placeholder:text-[color:var(--ink-faint)] focus:outline-none focus:ring-2 focus:ring-[color:var(--accent)]"
          />
          <Button type="button" className="shrink-0 px-5 py-2.5 text-xs">
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
      className="flex-1 px-3.5 py-2 text-center text-xs uppercase tracking-[0.18em] text-[color:var(--ink-soft)] transition hover:bg-[rgba(22,35,56,0.04)] hover:text-[color:var(--ink)] lg:flex-none"
    >
      {children}
    </Link>
  );
}

