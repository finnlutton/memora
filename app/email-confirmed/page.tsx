import { AppShell } from "@/components/app-shell";

export default function EmailConfirmedPage() {
  return (
    <AppShell>
      <section className="flex min-h-[calc(100vh-8rem)] items-center justify-center py-10 md:py-16">
        <div className="w-full max-w-3xl border border-[color:var(--border)] bg-[rgba(255,255,255,0.86)] px-8 py-12 text-center md:px-12 md:py-16">
          <h1 className="font-serif text-4xl leading-tight text-[color:var(--ink)] md:text-5xl">
            Email confirmed!
          </h1>
          <p className="mt-5 text-sm leading-7 text-[color:var(--ink-soft)] md:text-base">
            Go back to your previous tab and log in.
          </p>
        </div>
      </section>
    </AppShell>
  );
}
