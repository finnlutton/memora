"use client";

import { useEffect, useRef, useState } from "react";
import { useMemoraStore } from "@/hooks/use-memora-store";
import { useTabRecovery } from "@/hooks/use-tab-recovery";

/**
 * A subtle "Reconnecting…" pill anchored to the bottom-right while a
 * tab-return recovery is in flight. Renders nothing in the common
 * case. Mounts the visibility hook so it can run anywhere the
 * provider is mounted — typically once, at the top of the tree.
 *
 * Visual rules:
 *   - One small pill, never a full-width banner.
 *   - Auto-dismisses ~1.6s after `reconnecting` flips back to false
 *     so the user briefly sees a confirmation, then it fades out.
 *   - Does not block input. `pointer-events-none` so any underlying
 *     UI stays interactive throughout.
 */
export function RecoveryBanner() {
  // Ensures the visibility/focus listener is wired up wherever this
  // banner is mounted.
  useTabRecovery();

  const { reconnecting } = useMemoraStore();
  // Tracks whether the "settled" confirmation should be visible. Only
  // the setTimeout callback flips it back to false, so render is
  // pure (no Date.now() reads) and the lint rules are happy.
  const [showSettled, setShowSettled] = useState<boolean>(false);
  const prevReconnectingRef = useRef<boolean>(false);

  useEffect(() => {
    const wasReconnecting = prevReconnectingRef.current;
    prevReconnectingRef.current = reconnecting;
    if (!(wasReconnecting && !reconnecting)) {
      return;
    }
    // Reconnecting just transitioned true → false. Show the "You're
    // back." pill briefly, then let the timer callback clear it.
    // The synchronous setShowSettled(true) here is the standard
    // transient-feedback-from-external-store pattern (the external
    // system is the Memora store's `reconnecting` flag); the lint
    // rule's safer-default isn't a great fit for this case.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setShowSettled(true);
    const id = window.setTimeout(() => {
      setShowSettled(false);
    }, 1_600);
    return () => window.clearTimeout(id);
  }, [reconnecting]);

  const phase: "idle" | "active" | "settled" = reconnecting
    ? "active"
    : showSettled
      ? "settled"
      : "idle";

  if (phase === "idle") return null;

  const label = phase === "active" ? "Reconnecting…" : "You’re back.";

  return (
    <div
      role="status"
      aria-live="polite"
      style={{
        bottom:
          "calc(env(safe-area-inset-bottom, 0px) + var(--memora-bottom-banner, 0px) + 1rem)",
      }}
      className="pointer-events-none fixed right-4 z-[90] inline-flex items-center gap-2 rounded-full border border-[color:var(--border-strong)] bg-[color:var(--paper-strong)] px-3 py-1.5 text-[11px] uppercase tracking-[0.18em] text-[color:var(--ink-soft)] shadow-[0_8px_22px_rgba(14,22,34,0.12)] backdrop-blur"
    >
      <span
        aria-hidden
        className={`inline-block h-1.5 w-1.5 rounded-full ${
          phase === "active"
            ? "animate-pulse bg-[color:var(--accent-strong)]"
            : "bg-[color:var(--ink-soft)]"
        }`}
      />
      {label}
    </div>
  );
}
