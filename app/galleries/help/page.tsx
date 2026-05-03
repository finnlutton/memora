"use client";

import { useMemo, useState } from "react";
import { usePathname } from "next/navigation";
import { AppShell } from "@/components/app-shell";
import { WorkspaceTopbar } from "@/components/workspace-topbar";
import { Button } from "@/components/ui/button";
import { useMemoraStore } from "@/hooks/use-memora-store";

const ISSUE_CATEGORIES = [
  "Sharing problem",
  "Bug / something broken",
  "Gallery or photo issue",
  "Map / location issue",
  "Account issue",
  "Pricing or payment issue",
  "Login / sign-in issue",
  "Mobile layout issue",
  "Feature request",
  "General feedback",
  "Other",
] as const;

const MESSAGE_LIMIT = 250;

export default function HelpPage() {
  const pathname = usePathname();
  const { onboarding } = useMemoraStore();
  const [category, setCategory] = useState<string>(ISSUE_CATEGORIES[0]);
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const remainingCount = useMemo(() => MESSAGE_LIMIT - message.length, [message.length]);
  const userEmail = onboarding.user?.email ?? "";

  return (
    <AppShell>
      <WorkspaceTopbar
        eyebrow="Beta support"
        title="Help"
        subtitle="Seen something off? Send a quick note and I'll take a look."
      />

      <section className="max-w-2xl rounded-[1.5rem] border border-white/60 bg-white/74 p-4 shadow-[0_18px_56px_rgba(34,49,71,0.08)] backdrop-blur md:rounded-[2rem] md:p-6">
        <form
          className="space-y-4"
          onSubmit={async (event) => {
            event.preventDefault();
            if (busy) return;

            const trimmedMessage = message.trim();
            if (!trimmedMessage) {
              setError("Please add a short message before sending.");
              setSuccess(null);
              return;
            }

            setBusy(true);
            setError(null);
            setSuccess(null);

            try {
              const response = await fetch("/api/help-feedback", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                  category,
                  message: trimmedMessage,
                  path: pathname,
                }),
              });

              const payload = (await response.json()) as { error?: string };
              if (!response.ok) {
                throw new Error(payload.error ?? "Unable to send feedback right now.");
              }

              setMessage("");
              setSuccess("Thanks - your feedback was sent.");
            } catch (submitError) {
              setError(
                submitError instanceof Error
                  ? submitError.message
                  : "Could not send your feedback. Please try again.",
              );
            } finally {
              setBusy(false);
            }
          }}
        >
          <label className="block space-y-2">
            <span className="text-xs uppercase tracking-[0.2em] text-[color:var(--ink-faint)]">
              Issue category
            </span>
            <select
              value={category}
              onChange={(event) => setCategory(event.target.value)}
              className="w-full border border-[color:var(--border)] bg-white/85 px-3 py-2 text-base text-[color:var(--ink)] outline-none transition focus:border-[color:var(--accent)] md:text-sm"
            >
              {ISSUE_CATEGORIES.map((entry) => (
                <option key={entry} value={entry}>
                  {entry}
                </option>
              ))}
            </select>
          </label>

          <label className="block space-y-2">
            <span className="text-xs uppercase tracking-[0.2em] text-[color:var(--ink-faint)]">Message</span>
            <textarea
              value={message}
              onChange={(event) => setMessage(event.target.value.slice(0, MESSAGE_LIMIT))}
              maxLength={MESSAGE_LIMIT}
              placeholder="Briefly describe what happened, what page you were on, and what you expected."
              className="min-h-28 w-full resize-none border border-[color:var(--border)] bg-white/85 px-3 py-2 text-base leading-6 text-[color:var(--ink)] outline-none transition placeholder:text-[color:var(--ink-faint)] focus:border-[color:var(--accent)] md:text-sm"
            />
            <p className="text-xs text-[color:var(--ink-soft)]">{remainingCount} characters remaining</p>
          </label>

          {userEmail ? (
            <div className="space-y-1.5 rounded-xl bg-[rgba(244,249,255,0.85)] px-3 py-2 text-xs text-[color:var(--ink-soft)]">
              <p>
                <span className="text-[color:var(--ink-faint)]">Signed-in email:</span> {userEmail}
              </p>
            </div>
          ) : null}

          {error ? <p className="text-sm text-[#9a4545]">{error}</p> : null}
          {success ? <p className="text-sm text-[color:var(--ink)]">{success}</p> : null}

          <div className="flex md:justify-end">
            <Button
              type="submit"
              size="touch"
              disabled={busy || message.trim().length === 0}
              className="w-full md:w-auto"
            >
              {busy ? "Sending..." : "Send"}
            </Button>
          </div>
        </form>
      </section>
    </AppShell>
  );
}
