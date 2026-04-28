"use client";

import { useEffect, useRef } from "react";
import { useMemoraStore } from "@/hooks/use-memora-store";

/**
 * Detect a tab returning from the background and softly verify the
 * Supabase session + galleries via the store's `recoverFromBackground`
 * action.
 *
 * Why this matters: when a tab is hidden for more than a minute, the
 * browser may throttle its timers and pending fetches. On resume,
 * Supabase's own auth listener can fire SIGNED_IN even though the
 * user is the same, kicking off a full reload that previously felt
 * like a freeze on tab return. The store now skips that reload when
 * the user id hasn't changed; this hook is the corresponding signal
 * that says "we're back from background — please do a quick sanity
 * check" without ever mutating form state or forcing a navigation.
 *
 * Rules:
 *   - Skip recovery if the tab was only hidden briefly (`MIN_HIDDEN_MS`).
 *     Quick alt-tabs shouldn't pay any cost.
 *   - Coalesce visibilitychange + focus signals so a single return
 *     fires recovery exactly once.
 *   - Never read or write form/draft state from here.
 *   - Never reload the page.
 */

// Below this, ignore the resume — alt-tabbing for a moment shouldn't
// trigger a network round-trip. Tuned so any switch long enough for
// Supabase's own background refresh to fire still triggers a check.
const MIN_HIDDEN_MS = 30_000;

export function useTabRecovery() {
  const { recoverFromBackground, hydrated, onboarding } = useMemoraStore();
  const hiddenAtRef = useRef<number | null>(null);

  useEffect(() => {
    if (typeof window === "undefined") return;
    if (!hydrated) return;
    // Recovery is only meaningful for an authenticated user — for
    // demo/anonymous mode there's nothing to revalidate.
    if (!onboarding.isAuthenticated) return;

    const onHide = () => {
      if (document.visibilityState === "hidden") {
        hiddenAtRef.current = Date.now();
      }
    };

    const onShow = () => {
      const now = Date.now();
      const hiddenAt = hiddenAtRef.current;
      hiddenAtRef.current = null;
      if (hiddenAt === null) return;
      if (now - hiddenAt < MIN_HIDDEN_MS) return;
      // Fire and forget — recoverFromBackground handles its own
      // reconnecting state and never throws.
      void recoverFromBackground();
    };

    const onVisibilityChange = () => {
      if (document.visibilityState === "hidden") {
        onHide();
      } else if (document.visibilityState === "visible") {
        onShow();
      }
    };

    // Initial state — if the tab is already hidden when this hook
    // mounts (e.g. user navigated away mid-load), seed the timer.
    if (document.visibilityState === "hidden") {
      hiddenAtRef.current = Date.now();
    }

    document.addEventListener("visibilitychange", onVisibilityChange);
    // pageshow fires on bfcache restore — covers the "user navigates
    // away then back via the back button" path that visibilitychange
    // doesn't always catch.
    window.addEventListener("pageshow", onShow);

    return () => {
      document.removeEventListener("visibilitychange", onVisibilityChange);
      window.removeEventListener("pageshow", onShow);
    };
  }, [hydrated, onboarding.isAuthenticated, recoverFromBackground]);
}
