"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowRight } from "lucide-react";
import { AppShell } from "@/components/app-shell";
import { Button } from "@/components/ui/button";
import { createMembershipState, getNextAuthenticatedRoute } from "@/lib/onboarding";
import {
  ensureProfileRow,
  loadProfileState,
} from "@/lib/profile-state";
import { buildAbsoluteAppUrl, getClientSiteOrigin } from "@/lib/site-url";
import { createSupabaseBrowserClient } from "@/lib/supabase/browser";
import { useMemoraStore } from "@/hooks/use-memora-store";

const fieldClassName =
  "w-full rounded-[6px] border border-[color:var(--border)] bg-white px-4 py-3 text-base text-[color:var(--ink)] outline-none transition placeholder:text-[color:var(--ink-faint)] focus:border-[color:var(--accent)] focus:ring-1 focus:ring-[color:var(--accent)]/30 md:text-sm";

function safeInternalPath(value: string | null) {
  if (!value) return null;
  if (!value.startsWith("/")) return null;
  if (value.startsWith("//")) return null;
  return value;
}

function buildEmailRedirectUrl() {
  const appOrigin = getClientSiteOrigin();
  if (!appOrigin) {
    return undefined;
  }

  return buildAbsoluteAppUrl("/email-confirmed", appOrigin);
}

function navigateAfterAuth(nextRoute: string, router: ReturnType<typeof useRouter>) {
  if (typeof window !== "undefined") {
    window.location.replace(nextRoute);
    return;
  }

  router.replace(nextRoute);
}

export function AuthCard() {
  const router = useRouter();
  const { syncOnboardingFromUser } = useMemoraStore();
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
  const [forgotPasswordSent, setForgotPasswordSent] = useState(false);

  useEffect(() => {
    // Avoid useSearchParams() to keep /auth prerender/build happy in this Next version.
    if (typeof window === "undefined") {
      return;
    }

    const searchParams = new URLSearchParams(window.location.search);
    const value = safeInternalPath(searchParams.get("redirect"));
    const requestedMode = searchParams.get("mode");
    const callbackError = searchParams.get("error");
    const callbackMessage = searchParams.get("message");

    setRedirectTo(value);
    if (requestedMode === "signin" || requestedMode === "signup") {
      setMode(requestedMode);
    }
    if (callbackError) {
      setError(callbackMessage ?? "We couldn't complete that sign-in step. Please try again.");
      setMode("signin");
    }
  }, []);

  const handleForgotPassword = async () => {
    setError(null);
    setInfo(null);
    if (!email) {
      setError("Enter your email address above, then click Forgot password.");
      return;
    }
    setBusy(true);
    try {
      const supabase = createSupabaseBrowserClient();
      const { error: resetError } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: buildEmailRedirectUrl(),
      });
      if (resetError) {
        setError(resetError.message);
        return;
      }
      setForgotPasswordSent(true);
      setInfo(`Password reset email sent to ${email}. Check your inbox.`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to send reset email.");
    } finally {
      setBusy(false);
    }
  };

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
          options: {
            emailRedirectTo: buildEmailRedirectUrl(),
          },
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
        const profileState = data.user
          ? await loadProfileState(
              supabase,
              {
                id: data.user.id,
                email: data.user.email ?? null,
              },
              "auth-card:signup",
            )
          : { hasSeenWelcome: false, selectedPlanId: null };
        const nextRoute = getNextAuthenticatedRoute({
          ...createMembershipState(profileState.selectedPlanId),
          welcomeStepCompleted: profileState.hasSeenWelcome,
        });

        setIsTransitioning(true);
        setInfo("Creating your account...");
        syncOnboardingFromUser(data.user ?? null, profileState);
        navigateAfterAuth(nextRoute, router);
        return;
      } else {
        const { data, error: signInError } = await supabase.auth.signInWithPassword({
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
        if (data.user) {
          await ensureProfileRow(
            supabase,
            {
              id: data.user.id,
              email: data.user.email ?? null,
            },
            "auth-card:signin:ensure-profile",
          );
        }
        const profileState = data.user
          ? await loadProfileState(
              supabase,
              {
                id: data.user.id,
                email: data.user.email ?? null,
              },
              "auth-card:signin",
            )
          : { hasSeenWelcome: false, selectedPlanId: null };
        const membershipState = createMembershipState(profileState.selectedPlanId);
        const nextRoute = redirectTo ?? getNextAuthenticatedRoute({
          ...membershipState,
          welcomeStepCompleted: profileState.hasSeenWelcome,
        });

        setIsTransitioning(true);
        setInfo("Logging you in...");
        syncOnboardingFromUser(data.user ?? null, profileState);
        navigateAfterAuth(nextRoute, router);
        return;
      }
    } finally {
      setBusy(false);
    }
  };

  return (
    <AppShell>
      <section className="mx-auto grid max-w-6xl gap-6 py-8 xl:grid-cols-[0.78fr_1.22fr]">
        <div className="border border-[color:var(--border)] bg-[rgba(244,248,252,0.78)] p-6 md:p-8">
          <p className="text-[10px] uppercase tracking-[0.28em] text-[color:var(--ink-faint)]">
            Memora
          </p>
          <h1 className="mt-5 font-serif text-4xl leading-tight text-[color:var(--ink)] md:text-5xl">
            {mode === "signin" ? "Return to your archive." : "Start your archive."}
          </h1>
          <p className="mt-4 max-w-md text-sm leading-7 text-[color:var(--ink-soft)]">
            {mode === "signin"
              ? "Sign in to pick up where you left off."
              : "Create an account to start preserving the moments that matter."}
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
                        options: {
                          emailRedirectTo: buildEmailRedirectUrl(),
                        },
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

          <div className="my-6 border-t border-[color:var(--border)]" />

          <form
            onSubmit={(event) => {
              event.preventDefault();
              void submitAuth();
            }}
            className="space-y-4"
          >
            <label className="block space-y-2">
              <span className="text-xs text-[color:var(--ink-soft)]">
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
                <span className="text-xs text-[color:var(--ink-soft)]">
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
                {mode === "signin" && !forgotPasswordSent ? (
                  <button
                    type="button"
                    className="mt-1 block text-left text-[11px] text-[color:var(--ink-faint)] underline underline-offset-2 hover:text-[color:var(--ink-soft)]"
                    disabled={busy || isTransitioning}
                    onClick={() => void handleForgotPassword()}
                  >
                    Forgot password?
                  </button>
                ) : null}
              </label>
              {mode === "signup" ? (
                <label className="block space-y-2">
                  <span className="text-xs text-[color:var(--ink-soft)]">
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
              <p className="rounded-[6px] border border-[color:var(--border)] bg-[rgba(245,248,252,0.96)] px-3 py-2 text-sm leading-6 text-[color:var(--ink-soft)]">
                {info}
              </p>
            ) : null}
            {error ? (
              <p className="rounded-[6px] border border-[color:var(--error-border)] bg-[color:var(--error-bg)] px-3 py-2 text-sm leading-6 text-[color:var(--error-text)]">
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
