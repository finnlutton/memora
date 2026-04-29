"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { useMemoraStore } from "@/hooks/use-memora-store";
import { DISPLAY_NAME_MAX_LENGTH } from "@/lib/profile-state";

/**
 * Two-step personalization screen:
 *   1. Ask for a first name or nickname.
 *   2. After save, reveal a typed "Welcome, {Name}." and offer the
 *      "Enter Memora" button.
 *
 * The page reads `onboarding.displayName` from the store so a user
 * who already completed the welcome step lands directly in the
 * "ready to enter" state rather than being asked their name again
 * (covers the case where they refreshed mid-flow).
 */

const TYPING_INTERVAL_MS = 55;

type Stage = "naming" | "welcoming";

export default function WelcomePage() {
  const router = useRouter();
  const { hydrated, onboarding, completeWelcomeStep } = useMemoraStore();

  const [name, setName] = useState("");
  const [stage, setStage] = useState<Stage>(() =>
    onboarding.displayName ? "welcoming" : "naming",
  );
  const [busy, setBusy] = useState(false);
  const [entering, setEntering] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement | null>(null);

  // If the store finishes hydrating after we mounted and reveals an
  // existing display name, jump to the welcoming stage automatically.
  useEffect(() => {
    if (hydrated && onboarding.displayName && stage === "naming") {
      setStage("welcoming");
    }
  }, [hydrated, onboarding.displayName, stage]);

  // Autofocus the name input when the form is visible.
  useEffect(() => {
    if (stage === "naming" && hydrated) {
      inputRef.current?.focus();
    }
  }, [hydrated, stage]);

  if (!hydrated) {
    return (
      <main className="flex min-h-screen items-center justify-center px-4">
        <p className="text-[10px] uppercase tracking-[0.24em] text-[color:var(--ink-faint)]">
          Memora
        </p>
      </main>
    );
  }

  if (!onboarding.isAuthenticated) {
    return null;
  }

  const submitName = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError(null);
    setBusy(true);
    try {
      await completeWelcomeStep(name);
      setStage("welcoming");
    } catch (caught) {
      setError(
        caught instanceof Error
          ? caught.message
          : "Something went wrong saving your name.",
      );
    } finally {
      setBusy(false);
    }
  };

  const enterDashboard = () => {
    setEntering(true);
    router.replace("/galleries");
    router.refresh();
  };

  return (
    <main className="flex min-h-screen items-center justify-center px-4 py-10">
      <section className="w-full max-w-xl text-center">
        <p className="text-[10px] font-medium uppercase tracking-[0.24em] text-[color:var(--ink-soft)]">
          Memora
        </p>

        {stage === "naming" ? (
          <form onSubmit={submitName} className="mt-4 space-y-6">
            <div>
              <h1 className="font-serif text-3xl leading-tight text-[color:var(--ink)] md:text-5xl">
                What should we call you?
              </h1>
              <p className="mx-auto mt-3 max-w-md text-sm leading-7 text-[color:var(--ink-soft)] md:mt-4 md:text-[15px] md:leading-8">
                Just the version of your name you&apos;d like to see across your
                archive — first name or nickname is plenty.
              </p>
            </div>

            <div className="mx-auto max-w-sm space-y-2 text-left">
              <label
                htmlFor="welcome-name"
                className="block text-[11px] font-medium uppercase tracking-[0.16em] text-[color:var(--ink-soft)]"
              >
                Your name
              </label>
              <input
                ref={inputRef}
                id="welcome-name"
                type="text"
                autoComplete="given-name"
                required
                maxLength={DISPLAY_NAME_MAX_LENGTH}
                value={name}
                onChange={(event) => setName(event.target.value)}
                placeholder="First name or nickname"
                className="w-full border-0 border-b-[1.5px] border-[color:var(--border-strong)] bg-transparent px-0 py-3 text-center font-serif text-2xl text-[color:var(--ink)] outline-none transition placeholder:font-sans placeholder:text-base placeholder:font-normal placeholder:text-[color:var(--ink-faint)] hover:border-[color:var(--ink-soft)] focus:border-[color:var(--ink)] md:text-3xl"
              />
            </div>

            {error ? (
              <p className="mx-auto max-w-sm rounded-[6px] border border-[color:var(--error-border)] bg-[color:var(--error-bg)] px-3 py-2 text-sm leading-6 text-[color:var(--error-text)]">
                {error}
              </p>
            ) : null}

            <div className="flex justify-center">
              <Button
                type="submit"
                className="px-6"
                disabled={busy || !name.trim()}
              >
                {busy ? "Saving…" : "Continue"}
              </Button>
            </div>
          </form>
        ) : null}

        {stage === "welcoming" ? (
          <WelcomingState
            name={onboarding.displayName ?? name.trim() ?? "friend"}
            entering={entering}
            onEnter={enterDashboard}
          />
        ) : null}
      </section>
    </main>
  );
}

function WelcomingState({
  name,
  entering,
  onEnter,
}: {
  name: string;
  entering: boolean;
  onEnter: () => void;
}) {
  const fullText = useMemo(() => `Welcome, ${name}.`, [name]);
  const [revealed, setRevealed] = useState(0);

  // Char-by-char reveal — quiet, intentional, not a flashy typewriter.
  useEffect(() => {
    setRevealed(0);
    const id = window.setInterval(() => {
      setRevealed((current) => {
        if (current >= fullText.length) {
          window.clearInterval(id);
          return current;
        }
        return current + 1;
      });
    }, TYPING_INTERVAL_MS);
    return () => window.clearInterval(id);
  }, [fullText]);

  const done = revealed >= fullText.length;

  return (
    <div className="mt-6">
      <h1
        className="font-serif text-3xl leading-tight text-[color:var(--ink)] md:text-5xl"
        aria-label={fullText}
      >
        <span aria-hidden>{fullText.slice(0, revealed)}</span>
        <span
          aria-hidden
          className={`ml-1 inline-block h-[1em] w-[2px] -translate-y-[0.08em] align-middle bg-[color:var(--ink)] ${
            done ? "animate-pulse" : ""
          }`}
        />
      </h1>
      <p className="mx-auto mt-4 max-w-md text-sm leading-7 text-[color:var(--ink-soft)] md:mt-5 md:text-[15px] md:leading-8">
        Your archive is ready. Collect galleries, preserve memories, and share
        them with the people who matter.
      </p>
      <div className="mt-8 flex justify-center">
        <Button
          type="button"
          className="px-6"
          disabled={!done || entering}
          onClick={onEnter}
        >
          {entering ? "Entering…" : "Enter Memora"}
        </Button>
      </div>
    </div>
  );
}
