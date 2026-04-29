"use client";

import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { createSupabaseBrowserClient } from "@/lib/supabase/browser";

/**
 * Password recovery callback.
 *
 * Supabase's `resetPasswordForEmail` sends a magic link that lands
 * here with a recovery code in the URL. The browser client has
 * `detectSessionInUrl: true` by default and will exchange that
 * code into a transient session as soon as the page loads.
 *
 * We then expose a tiny "set new password" form that calls
 * `updateUser({ password })` and signs the user out on success so
 * they re-enter the auth flow on whatever device they actually want
 * to log in on. The transient recovery session is not a long-lived
 * authenticated state — closing the loop with a fresh sign-in is
 * the cleaner story.
 */

const MIN_PASSWORD_LENGTH = 8;

type Status = "checking" | "ready" | "invalid" | "submitting" | "done";

export default function ResetPasswordPage() {
  const [status, setStatus] = useState<Status>("checking");
  const [error, setError] = useState<string | null>(null);
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");

  // Wait briefly for the SDK to consume the URL fragment / query and
  // settle a session. If a user shows up, the recovery worked.
  useEffect(() => {
    let cancelled = false;
    const supabase = createSupabaseBrowserClient();

    // The PASSWORD_RECOVERY auth event fires once the SDK has
    // exchanged the recovery code in the URL for a session. Listen
    // first so we don't race the SDK on slow networks.
    const { data: subscription } = supabase.auth.onAuthStateChange(
      (event: string) => {
        if (cancelled) return;
        if (event === "PASSWORD_RECOVERY" || event === "SIGNED_IN") {
          setStatus("ready");
        }
      },
    );

    // In case the URL was consumed before this listener attached,
    // double-check current session synchronously.
    void (async () => {
      const { data } = await supabase.auth.getSession();
      if (cancelled) return;
      if (data.session) {
        setStatus("ready");
      } else {
        // Give the SDK a moment to consume the URL on first paint.
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
              The link may have expired or already been used. Head back to the
              login page and request a new one.
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
