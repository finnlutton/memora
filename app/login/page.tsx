"use client";

import Link from "next/link";
import { useState } from "react";
import { AppShell } from "@/components/app-shell";
import { Button } from "@/components/ui/button";

const fieldClassName =
  "w-full rounded-sm border border-[color:var(--border)] bg-white px-4 py-3 text-sm text-[color:var(--ink)] outline-none transition placeholder:text-[color:var(--ink-faint)] focus:border-[color:var(--accent)] focus:ring-1 focus:ring-[color:var(--accent)]/30";

export default function LoginPage() {
  const [mode, setMode] = useState<"signin" | "signup">("signin");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");

  return (
    <AppShell>
      <section className="mx-auto max-w-md">
        <div className="border border-[color:var(--border)] bg-[rgba(255,255,255,0.9)] p-6 md:p-8">
          <p className="text-[10px] uppercase tracking-[0.28em] text-[color:var(--ink-faint)]">
            Get started
          </p>
          <h1 className="mt-2 font-serif text-2xl leading-tight text-[color:var(--ink)] md:text-3xl">
            {mode === "signin" ? "Sign in" : "Create an account"}
          </h1>
          <p className="mt-2 text-sm leading-6 text-[color:var(--ink-soft)]">
            {mode === "signin"
              ? "Enter your credentials to access your memory archive."
              : "Start building your archive of meaningful moments."}
          </p>

          <form
            onSubmit={(e) => e.preventDefault()}
            className="mt-6 space-y-4"
          >
            {mode === "signup" && (
              <label className="block space-y-2">
                <span className="text-xs text-[color:var(--ink-soft)]">Name</span>
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Your name"
                  className={fieldClassName}
                />
              </label>
            )}
            <label className="block space-y-2">
              <span className="text-xs text-[color:var(--ink-soft)]">Email</span>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@example.com"
                className={fieldClassName}
              />
            </label>
            <label className="block space-y-2">
              <span className="text-xs text-[color:var(--ink-soft)]">Password</span>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                className={fieldClassName}
              />
            </label>
            <Button type="submit" className="w-full justify-center px-4 py-3 text-xs">
              {mode === "signin" ? "Sign in" : "Create account"}
            </Button>
          </form>

          <p className="mt-6 text-center text-xs text-[color:var(--ink-soft)]">
            {mode === "signin" ? (
              <>
                Don&apos;t have an account?{" "}
                <button
                  type="button"
                  onClick={() => setMode("signup")}
                  className="text-[color:var(--ink)] underline decoration-[color:var(--ink-soft)] underline-offset-2 transition hover:decoration-[color:var(--accent-strong)]"
                >
                  Sign up
                </button>
              </>
            ) : (
              <>
                Already have an account?{" "}
                <button
                  type="button"
                  onClick={() => setMode("signin")}
                  className="text-[color:var(--ink)] underline decoration-[color:var(--ink-soft)] underline-offset-2 transition hover:decoration-[color:var(--accent-strong)]"
                >
                  Sign in
                </button>
              </>
            )}
          </p>
        </div>

        <p className="mt-4 text-center text-[11px] text-[color:var(--ink-faint)]">
          <Link
            href="/"
            className="transition hover:text-[color:var(--ink-soft)]"
          >
            ← Back to home
          </Link>
        </p>
      </section>
    </AppShell>
  );
}
