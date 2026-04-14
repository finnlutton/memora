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
      <section className="mx-auto flex min-h-[calc(100vh-11rem)] w-full max-w-4xl items-center justify-center py-8">
        <div className="w-full rounded-[1.5rem] border border-[color:var(--border)] bg-[rgba(255,255,255,0.86)] px-6 py-12 text-center md:px-10 md:py-16">
          <h1 className="font-serif text-4xl leading-tight text-[color:var(--ink)] md:text-6xl">
            Welcome to Memora
          </h1>
          <p className="mx-auto mt-4 max-w-2xl text-sm leading-7 text-[color:var(--ink-soft)] md:text-base">
            Thanks for creating an account. Start building your archive and sharing meaningful moments.
          </p>
          {error ? (
            <p className="mx-auto mt-6 max-w-xl rounded-sm border border-[#c98282] bg-[#fff7f7] px-3 py-2 text-sm leading-6 text-[#9a4545]">
              {error}
            </p>
          ) : null}
          <div className="mt-8 flex justify-center">
            <Button
              type="button"
              className="px-5"
              disabled={busy}
              onClick={async () => {
                setBusy(true);
                setError(null);
                try {
                  await completeWelcomeStep();
                  router.replace("/galleries");
                } catch (welcomeError) {
                  console.error("Memora: welcome continue failed", welcomeError);
                  setError(
                    welcomeError instanceof Error
                      ? welcomeError.message
                      : "Unable to update your welcome status right now.",
                  );
                } finally {
                  setBusy(false);
                }
              }}
            >
              {busy ? "Entering..." : "Enter Memora"}
            </Button>
          </div>
        </div>
      </section>
    </AppShell>
  );
}
