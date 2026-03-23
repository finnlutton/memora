"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Apple, ArrowRight, Chrome } from "lucide-react";
import { AppShell } from "@/components/app-shell";
import { Button } from "@/components/ui/button";
import { useMemoraStore } from "@/hooks/use-memora-store";

const fieldClassName =
  "w-full rounded-sm border border-[color:var(--border)] bg-white px-4 py-3 text-sm text-[color:var(--ink)] outline-none transition placeholder:text-[color:var(--ink-faint)] focus:border-[color:var(--accent)] focus:ring-1 focus:ring-[color:var(--accent)]/30";

export function AuthCard() {
  const router = useRouter();
  const { signIn } = useMemoraStore();
  const [mode, setMode] = useState<"signin" | "signup">("signup");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");

  const submitAuth = () => {
    if (mode === "signup" && password !== confirmPassword) {
      return;
    }

    signIn(email);
    router.push("/pricing");
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
              ? "Sign in to continue with your membership selection."
              : "Create an account to choose a membership and begin building your archive."}
          </p>
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
              onClick={() => {
                signIn("apple@memora.app");
                router.push("/pricing");
              }}
            >
              <Apple className="h-4 w-4" />
              Continue with Apple
            </Button>
            <Button
              type="button"
              variant="secondary"
              className="justify-center"
              onClick={() => {
                signIn("google@memora.app");
                router.push("/pricing");
              }}
            >
              <Chrome className="h-4 w-4" />
              Continue with Google
            </Button>
          </div>

          <div className="my-6 border-t border-[color:var(--border)]" />

          <form
            onSubmit={(event) => {
              event.preventDefault();
              submitAuth();
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
                  />
                </label>
              ) : null}
            </div>

            <Button type="submit" className="mt-3 w-full justify-center">
              {mode === "signin" ? "Continue to membership" : "Create account"}
              <ArrowRight className="h-4 w-4" />
            </Button>
          </form>
        </div>
      </section>
    </AppShell>
  );
}
