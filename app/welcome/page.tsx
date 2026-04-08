"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
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
      <section className="flex min-h-[calc(100vh-8rem)] items-center justify-center py-10 md:py-16">
        <div className="w-full max-w-4xl border border-[color:var(--border)] bg-[rgba(255,255,255,0.88)] px-8 py-14 text-center md:px-12 md:py-20">
          <h1 className="font-serif text-4xl leading-tight text-[color:var(--ink)] md:text-6xl">
            Welcome to Memora
          </h1>
          {error ? (
            <p className="mx-auto mt-6 max-w-xl rounded-sm border border-[#c98282] bg-[#fff7f7] px-3 py-2 text-sm leading-6 text-[#9a4545]">
              {error}
            </p>
          ) : null}
          <div className="mt-8">
            <Button
              type="button"
              variant="secondary"
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
              {busy ? "Continuing..." : "Click to continue"}
            </Button>
          </div>
        </div>
      </section>
    </AppShell>
  );
}
