"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { useMemoraStore } from "@/hooks/use-memora-store";

export default function WelcomePage() {
  const router = useRouter();
  const { hydrated, onboarding } = useMemoraStore();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!hydrated || !onboarding.isAuthenticated) {
    return null;
  }

  return (
    <main className="flex min-h-screen items-center justify-center px-4">
      <section className="w-full max-w-3xl text-center">
        <h1 className="font-serif text-4xl leading-tight text-[color:var(--ink)] md:text-6xl">
          Welcome to Memora
        </h1>
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
                const response = await fetch("/api/onboarding/welcome-complete", { method: "POST" });
                const payload = (await response.json()) as { error?: string };
                if (!response.ok) {
                  throw new Error(payload.error ?? "Unable to complete welcome step.");
                }
                router.replace("/galleries");
                router.refresh();
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
      </section>
    </main>
  );
}
