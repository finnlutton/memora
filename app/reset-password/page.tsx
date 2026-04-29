"use client";

import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { createSupabaseBrowserClient } from "@/lib/supabase/browser";

/**
 * Password recovery form.
 *
 * The OTP/PKCE exchange happens server-side in `/auth/callback` (which
 * `resetPasswordForEmail` redirects to via `?next=/reset-password`). By the
 * time we render here, the recovery session cookie is already set — we just
 * confirm with `getSession()` and show the "set new password" form.
 *
 * `updateUser({ password })` then writes the new password and we sign the
 * recovery session out so the user re-enters the normal login flow on
 * whatever device they actually use.
 */

const MIN_PASSWORD_LENGTH = 8;

type Status = "checking" | "ready" | "invalid" | "submitting" | "done";

function describeUrlError(): string | null {
  if (typeof window === "undefined") return null;
  const params = new URLSearchParams(window.location.search);
  // Supabase implicit-flow errors arrive in the URL fragment; PKCE/server
  // errors come back as query params. Read both.
  const hash = window.location.hash.startsWith("#")
    ? window.location.hash.slice(1)
    : "";
  const fragment = new URLSearchParams(hash);
  const errorCode =
    params.get("error_code") ?? fragment.get("error_code") ?? null;
  const errorDescription =
    params.get("error_description") ?? fragment.get("error_description") ?? null;
  const error = params.get("error") ?? fragment.get("error") ?? null;
  if (!errorCode && !errorDescription && !error) return null;
  if (errorDescription) return errorDescription.replace(/\+/g, " ");
  if (errorCode) return errorCode.replace(/_/g, " ");
  return error;
}

export default function ResetPasswordPage() {
  const [status, setStatus] = useState<Status>("checking");
  const [error, setError] = useState<string | null>(null);
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");

  useEffect(() => {
    let cancelled = false;

    // If the email link verification failed upstream, Supabase redirects
    // here with the failure reason in the URL. Surface it instead of the
    // generic "expired" copy.
    const urlError = describeUrlError();
    if (urlError) {
      setError(urlError);
      setStatus("invalid");
      return;
    }

    const supabase = createSupabaseBrowserClient();

    const { data: subscription } = supabase.auth.onAuthStateChange(
      (event: string) => {
        if (cancelled) return;
        if (event === "PASSWORD_RECOVERY" || event === "SIGNED_IN") {
          setStatus("ready");
        }
      },
    );

    void (async () => {
      const { data } = await supabase.auth.getSession();
      if (cancelled) return;
      if (data.session) {
        setStatus("ready");
      } else {
        // Server-side exchange should have set the cookie before we render,
        // but allow one short retry in case the redirect raced cookie write.
        window.setTimeout(async () => {
          if (cancelled) return;
          const recheck = await supabase.auth.getSession();
          if (cancelled) return;
          if (recheck.data.session) {
            setStatus("ready");
          } else {
            setStatus("invalid");
          }
        }, 1500);
      }
    })();

    return () => {
      cancelled = true;
      subscription?.subscription?.unsubscribe();
    };
  }, []);

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError(null);
    if (password.length < MIN_PASSWORD_LENGTH) {
      setError(`Use at least ${MIN_PASSWORD_LENGTH} characters.`);
      return;
    }
    if (password !== confirmPassword) {
      setError("Those passwords don't match.");
      return;
    }
    setStatus("submitting");
    try {
      const supabase = createSupabaseBrowserClient();
      const { error: updateError } = await supabase.auth.updateUser({ password });
      if (updateError) {
        setError(updateError.message);
        setStatus("ready");
        return;
      }
      // Sign the recovery session out — the user should re-enter on
      // whatever device they actually use, with their new password.
      await supabase.auth.signOut();
      setStatus("done");
    } catch (caught) {
      setError(
        caught instanceof Error
          ? caught.message
          : "Something went wrong updating your password.",
      );
      setStatus("ready");
    }
  };

  return (
    <main className="flex min-h-screen items-center justify-center px-4 py-10">
      <section className="w-full max-w-md">
        <p className="text-[10px] font-medium uppercase tracking-[0.24em] text-[color:var(--ink-soft)]">
          Memora
        </p>

        {status === "checking" ? (
          <div className="mt-3">
            <h1 className="font-serif text-3xl leading-tight text-[color:var(--ink)] md:text-4xl">
              Checking your link…
            </h1>
            <p className="mt-3 text-sm leading-7 text-[color:var(--ink-soft)]">
              One moment while we confirm the reset link.
            </p>
          </div>
        ) : null}

        {status === "invalid" ? (
          <div className="mt-3">
            <h1 className="font-serif text-3xl leading-tight text-[color:var(--ink)] md:text-4xl">
              This reset link is no longer valid
            </h1>
            <p className="mt-3 text-sm leading-7 text-[color:var(--ink-soft)]">
              {error
                ? error
                : "The link may have expired or already been used. Head back to the login page and request a new one."}
            </p>
            <a
              href="/auth?mode=signin"
              className="mt-6 inline-block text-sm text-[color:var(--ink)] underline underline-offset-4"
            >
              Return to log in →
            </a>
          </div>
        ) : null}

        {status === "done" ? (
          <div className="mt-3">
            <h1 className="font-serif text-3xl leading-tight text-[color:var(--ink)] md:text-4xl">
              Your password has been reset
            </h1>
            <p className="mt-3 text-sm leading-7 text-[color:var(--ink-soft)]">
              You can close this tab and log in again with your new password.
            </p>
            <a
              href="/auth?mode=signin"
              className="mt-6 inline-block text-sm text-[color:var(--ink)] underline underline-offset-4"
            >
              Go to log in →
            </a>
          </div>
        ) : null}

        {status === "ready" || status === "submitting" ? (
          <form onSubmit={handleSubmit} className="mt-3 space-y-4">
            <div>
              <h1 className="font-serif text-3xl leading-tight text-[color:var(--ink)] md:text-4xl">
                Set a new password
              </h1>
              <p className="mt-3 text-sm leading-7 text-[color:var(--ink-soft)]">
                Choose a password you haven&apos;t used here before. After
                saving, you&apos;ll log in again with the new one.
              </p>
            </div>

            <div className="space-y-2">
              <label
                htmlFor="reset-password"
                className="text-[11px] font-medium uppercase tracking-[0.16em] text-[color:var(--ink-soft)]"
              >
                New password
              </label>
              <input
                id="reset-password"
                type="password"
                autoComplete="new-password"
                required
                minLength={MIN_PASSWORD_LENGTH}
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                className="w-full rounded-[6px] border border-[color:var(--border)] bg-white px-4 py-3 text-base text-[color:var(--ink)] outline-none transition placeholder:text-[color:var(--ink-faint)] focus:border-[color:var(--accent)] focus:ring-1 focus:ring-[color:var(--accent)]/30 md:text-sm"
                placeholder="At least 8 characters"
              />
            </div>

            <div className="space-y-2">
              <label
                htmlFor="reset-password-confirm"
                className="text-[11px] font-medium uppercase tracking-[0.16em] text-[color:var(--ink-soft)]"
              >
                Confirm password
              </label>
              <input
                id="reset-password-confirm"
                type="password"
                autoComplete="new-password"
                required
                minLength={MIN_PASSWORD_LENGTH}
                value={confirmPassword}
                onChange={(event) => setConfirmPassword(event.target.value)}
                className="w-full rounded-[6px] border border-[color:var(--border)] bg-white px-4 py-3 text-base text-[color:var(--ink)] outline-none transition placeholder:text-[color:var(--ink-faint)] focus:border-[color:var(--accent)] focus:ring-1 focus:ring-[color:var(--accent)]/30 md:text-sm"
                placeholder="Type it again"
              />
            </div>

            {error ? (
              <p className="rounded-[6px] border border-[color:var(--error-border)] bg-[color:var(--error-bg)] px-3 py-2 text-sm text-[color:var(--error-text)]">
                {error}
              </p>
            ) : null}

            <Button
              type="submit"
              disabled={status === "submitting"}
              className="w-full justify-center"
            >
              {status === "submitting" ? "Saving…" : "Save new password"}
            </Button>
          </form>
        ) : null}
      </section>
    </main>
  );
}
