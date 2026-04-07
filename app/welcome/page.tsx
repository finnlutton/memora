"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowRight } from "lucide-react";
import { AppShell } from "@/components/app-shell";
import { Button } from "@/components/ui/button";
import { useMemoraStore } from "@/hooks/use-memora-store";

export default function WelcomePage() {
  const router = useRouter();
  const { hydrated, onboarding, completeWelcomeStep } = useMemoraStore();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!hydrated || !onboarding.isAuthenticated) {
    return null;
  }

  return (
    <AppShell>
      <section className="mx-auto max-w-4xl py-10 md:py-14">
        <div className="border border-[color:var(--border)] bg-[rgba(255,255,255,0.88)] p-8 md:p-12">
          <p className="text-[11px] uppercase tracking-[0.32em] text-[color:var(--ink-faint)]">
            Welcome
          </p>
          <h1 className="mt-4 font-serif text-4xl leading-tight text-[color:var(--ink)] md:text-5xl">
            Welcome to Memora
          </h1>
          <p className="mt-4 text-base leading-8 text-[color:var(--ink-soft)]">
            Account created. Your archive is ready.
          </p>
          <p className="mt-2 max-w-2xl text-sm leading-7 text-[color:var(--ink-soft)]">
            Before you begin, choose the membership that fits how you want to collect, revisit,
            and share your memories.
          </p>
          {error ? (
            <p className="mt-6 rounded-sm border border-[#c98282] bg-[#fff7f7] px-3 py-2 text-sm leading-6 text-[#9a4545]">
              {error}
            </p>
          ) : null}
          <div className="mt-8">
            <Button
              type="button"
              disabled={busy}
              onClick={async () => {
                setBusy(true);
                setError(null);
                try {
                  await completeWelcomeStep();
                  router.push("/pricing");
                } catch (welcomeError) {
                  setError(
                    welcomeError instanceof Error
                      ? welcomeError.message
                      : "Unable to continue right now.",
                  );
                } finally {
                  setBusy(false);
                }
              }}
            >
              {busy ? "Continuing..." : "Choose your plan"}
              <ArrowRight className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </section>
    </AppShell>
  );
}
