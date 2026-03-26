"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Apple, ArrowRight, Chrome } from "lucide-react";
import { AppShell } from "@/components/app-shell";
import { useMemoraStore } from "@/hooks/use-memora-store";
import { Button } from "@/components/ui/button";
import { createSupabaseBrowserClient } from "@/lib/supabase/browser";

const fieldClassName =
  "w-full rounded-sm border border-[color:var(--border)] bg-white px-4 py-3 text-sm text-[color:var(--ink)] outline-none transition placeholder:text-[color:var(--ink-faint)] focus:border-[color:var(--accent)] focus:ring-1 focus:ring-[color:var(--accent)]/30";

function safeRedirectPath(value: string | null) {
  if (!value) return null;
  if (!value.startsWith("/")) return null;
  if (value.startsWith("//")) return null;
  return value;
}

function getPostAuthRoute({
  selectedPlanId,
  onboardingComplete,
}: {
  selectedPlanId: string | null;
  onboardingComplete: boolean;
}) {
  if (!selectedPlanId) {
    return "/pricing";
  }
  if (!onboardingComplete) {
    return "/checkout";
  }
  return "/galleries";
}

export function AuthCard() {
  const router = useRouter();
  const { onboarding } = useMemoraStore();
  const [mode, setMode] = useState<"signin" | "signup">("signup");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [pendingEmailConfirmation, setPendingEmailConfirmation] = useState(false);
  const [info, setInfo] = useState<string | null>(null);
  const [redirectTo, setRedirectTo] = useState<string | null>(null);
  const [isTransitioning, setIsTransitioning] = useState(false);

  useEffect(() => {
    // Avoid useSearchParams() to keep /auth prerender/build happy in this Next version.
    const value =
      typeof window === "undefined"
        ? null
        : safeRedirectPath(new URLSearchParams(window.location.search).get("redirect"));
    setRedirectTo(value);
  }, []);

  const submitAuth = async () => {
    setError(null);
    setInfo(null);
    setBusy(true);

    try {
      const supabase = createSupabaseBrowserClient();
      setPendingEmailConfirmation(false);

      if (!email || !password) {
        setError("Please enter an email and password.");
        return;
      }

      if (mode === "signup") {
        if (password !== confirmPassword) {
          setError("Passwords do not match.");
          return;
        }
        const { data, error: signUpError } = await supabase.auth.signUp({
          email,
          password,
        });
        if (signUpError) {
          setError(signUpError.message);
          return;
        }
        // When Supabase email confirmation is enabled, signUp succeeds but returns no session.
        if (!data.session) {
          setPendingEmailConfirmation(true);
          setInfo("Check your email to confirm your account, then come back and log in.");
          setMode("signin");
          setPassword("");
          setConfirmPassword("");
          return;
        }
      } else {
        const { error: signInError } = await supabase.auth.signInWithPassword({
          email,
          password,
        });
        if (signInError) {
          if (signInError.message.toLowerCase().includes("email not confirmed")) {
            setError("Please confirm your email address, then try logging in again.");
          } else {
            setError(signInError.message);
          }
          return;
        }
      }

      setIsTransitioning(true);
      setInfo(mode === "signin" ? "Logging you in..." : "Creating your account...");

      const nextRoute =
        redirectTo ??
        getPostAuthRoute({
          selectedPlanId: onboarding.selectedPlanId,
          onboardingComplete: onboarding.onboardingComplete,
        });
      await new Promise((resolve) => window.setTimeout(resolve, 450));
      router.replace(nextRoute);
    } finally {
      setBusy(false);
    }
  };

  return (
    <AppShell>
      <section className="mx-auto grid max-w-6xl gap-6 py-8 xl:grid-cols-[0.78fr_1.22fr]">
        <div className="border border-[color:var(--border)] bg-[rgba(244,248,252,0.78)] p-6 md:p-8">
          <p className="text-[11px] uppercase tracking-[0.32em] text-[color:var(--ink-faint)]">
            Entry
          </p>
          <h1 className="mt-4 font-serif text-4xl leading-tight text-[color:var(--ink)] md:text-5xl">
            {mode === "signin" ? "Return to your archive." : "Start your archive."}
          </h1>
          <p className="mt-4 max-w-md text-sm leading-7 text-[color:var(--ink-soft)]">
            {mode === "signin"
              ? "Sign in to continue."
              : "Create an account to begin building your archive."}
          </p>
          {pendingEmailConfirmation ? (
            <div className="mt-5 border-t border-[color:var(--border)] pt-5">
              <p className="text-sm leading-7 text-[color:var(--ink-soft)]">
                We’ve sent a confirmation link to <span className="text-[color:var(--ink)]">{email}</span>.
              </p>
              <div className="mt-3 flex flex-wrap gap-2">
                <Button
                  type="button"
                  variant="secondary"
                  disabled={busy || !email}
                  onClick={async () => {
                    setError(null);
                    setInfo(null);
                    try {
                      const supabase = createSupabaseBrowserClient();
                      const { error: resendError } = await supabase.auth.resend({
                        type: "signup",
                        email,
                      });
                      if (resendError) {
                        setError(resendError.message);
                        return;
                      }
                      setInfo("Confirmation email resent.");
                    } catch (err) {
                      setError(err instanceof Error ? err.message : "Failed to resend email.");
                    }
                  }}
                >
                  Resend confirmation
                </Button>
                <Button type="button" variant="secondary" onClick={() => setMode("signin")}>
                  Go to log in
                </Button>
              </div>
            </div>
          ) : null}
        </div>

        <div className="border border-[color:var(--border)] bg-[rgba(255,255,255,0.86)] p-6 md:p-8">
          <div className="flex gap-2 border-b border-[color:var(--border)] pb-5">
            <button
              type="button"
              onClick={() => setMode("signup")}
              className={`px-3 py-2 text-[11px] uppercase tracking-[0.2em] ${
                mode === "signup"
                  ? "border border-[color:var(--border-strong)] bg-[color:var(--paper)] text-[color:var(--ink)]"
                  : "text-[color:var(--ink-faint)]"
              }`}
            >
              Sign up
            </button>
            <button
              type="button"
              onClick={() => setMode("signin")}
              className={`px-3 py-2 text-[11px] uppercase tracking-[0.2em] ${
                mode === "signin"
                  ? "border border-[color:var(--border-strong)] bg-[color:var(--paper)] text-[color:var(--ink)]"
                  : "text-[color:var(--ink-faint)]"
              }`}
            >
              Log in
            </button>
          </div>

          <div className="mt-6 grid gap-3 sm:grid-cols-2">
            <Button
              type="button"
              variant="secondary"
              className="justify-center"
              disabled
            >
              <Apple className="h-4 w-4" />
              Continue with Apple
            </Button>
            <Button
              type="button"
              variant="secondary"
              className="justify-center"
              disabled
            >
              <Chrome className="h-4 w-4" />
              Continue with Google
            </Button>
          </div>

          <div className="my-6 border-t border-[color:var(--border)]" />

          <form
            onSubmit={(event) => {
              event.preventDefault();
              void submitAuth();
            }}
            className="space-y-4"
          >
            <label className="block space-y-2">
              <span className="text-[11px] uppercase tracking-[0.22em] text-[color:var(--ink-faint)]">
                Email
              </span>
              <input
                type="email"
                required
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                placeholder="you@example.com"
              className={fieldClassName}
                disabled={busy || isTransitioning}
              />
            </label>

            <div className={`grid gap-4 ${mode === "signup" ? "md:grid-cols-2" : ""}`}>
              <label className="block space-y-2">
                <span className="text-[11px] uppercase tracking-[0.22em] text-[color:var(--ink-faint)]">
                  Password
                </span>
                <input
                  type="password"
                  required
                  value={password}
                  onChange={(event) => setPassword(event.target.value)}
                  placeholder="••••••••"
                  className={fieldClassName}
                  disabled={busy || isTransitioning}
                />
              </label>
              {mode === "signup" ? (
                <label className="block space-y-2">
                  <span className="text-[11px] uppercase tracking-[0.22em] text-[color:var(--ink-faint)]">
                    Confirm password
                  </span>
                    <input
                    type="password"
                    required
                    value={confirmPassword}
                    onChange={(event) => setConfirmPassword(event.target.value)}
                    placeholder="••••••••"
                    className={fieldClassName}
                    disabled={busy || isTransitioning}
                  />
                </label>
              ) : null}
            </div>

            {info ? (
              <p className="rounded-sm border border-[color:var(--border)] bg-[rgba(245,248,252,0.96)] px-3 py-2 text-sm leading-6 text-[color:var(--ink-soft)]">
                {info}
              </p>
            ) : null}
            {error ? (
              <p className="rounded-sm border border-[#c98282] bg-[#fff7f7] px-3 py-2 text-sm leading-6 text-[#9a4545]">
                {error}
              </p>
            ) : null}

            <Button type="submit" className="mt-3 w-full justify-center" disabled={busy || isTransitioning}>
              {isTransitioning
                ? mode === "signin"
                  ? "Logging you in..."
                  : "Creating account..."
                : mode === "signin"
                  ? "Log in"
                  : "Create account"}
              <ArrowRight className="h-4 w-4" />
            </Button>
          </form>
        </div>
      </section>
    </AppShell>
  );
}
