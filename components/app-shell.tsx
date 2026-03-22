import Link from "next/link";
import { Camera, LayoutGrid, Sparkles } from "lucide-react";
import { cn } from "@/lib/utils";

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
        <div className="mx-auto flex w-full max-w-7xl items-center justify-between px-5 py-4 md:px-8">
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
          <nav className="flex items-center gap-1 border border-[color:var(--border)] bg-[rgba(255,255,255,0.8)] p-1">
            <NavLink href="/">Home</NavLink>
            <NavLink href="/galleries">Galleries</NavLink>
            <NavLink href="/galleries/new">Create</NavLink>
          </nav>
        </div>
      </header>
      <main className="relative z-10 mx-auto w-full max-w-7xl px-5 py-8 md:px-8 md:py-10">
        {children}
      </main>
      <footer className="mx-auto mt-12 w-full max-w-7xl px-5 pb-10 md:px-8">
        <div className="border border-[color:var(--border)] bg-[rgba(255,255,255,0.82)] px-6 py-5 backdrop-blur">
          <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
            <div className="space-y-1">
              <p className="font-serif text-lg text-[color:var(--ink)]">
                Built for memories with structure, sequence, and permanence.
              </p>
              <p className="text-sm text-[color:var(--ink-soft)]">
                Organize by gallery, move by subgallery, and keep every chapter visually coherent.
              </p>
            </div>
            <div className="flex items-center gap-3 text-sm text-[color:var(--ink-soft)]">
              <FooterChip icon={LayoutGrid} label="Structured" />
              <FooterChip icon={Sparkles} label="Reflective" />
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}

function NavLink({ href, children }: { href: string; children: React.ReactNode }) {
  return (
    <Link
      href={href}
      className="px-3.5 py-2 text-xs uppercase tracking-[0.18em] text-[color:var(--ink-soft)] transition hover:bg-[rgba(22,35,56,0.04)] hover:text-[color:var(--ink)]"
    >
      {children}
    </Link>
  );
}

function FooterChip({
  icon: Icon,
  label,
}: {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
}) {
  return (
    <span className="inline-flex items-center gap-2 border border-[color:var(--border)] bg-[color:var(--paper)] px-3 py-2">
      <Icon className="h-4 w-4 text-[color:var(--accent)]" />
      {label}
    </span>
  );
}
