"use client";

import { useEffect, useState } from "react";
import type { BillingStatusResponse } from "@/app/api/billing/status/route";
import { useMemoraStore } from "@/hooks/use-memora-store";

/**
 * Single-fetch hook for the user's Stripe + plan billing state.
 *
 * Module-scoped cache + in-flight dedupe: when multiple components mount
 * simultaneously (e.g. BillingStatusCard + MembershipPlansPanel on the
 * pricing page), only one network request fires and every consumer sees
 * the same data. The cache is invalidated on auth-state change and on
 * an explicit refetch().
 *
 * Re-fetches automatically when the URL contains `?checkout=success` so
 * the user sees their new plan reflected immediately after returning
 * from Stripe Checkout (the webhook may have already written by then).
 */

type State = {
  status: BillingStatusResponse | null;
  loading: boolean;
  error: string | null;
};

// Module-level cache — survives across component mounts within a tab,
// dies on full reload (which is what we want; auth changes flush via
// invalidate()).
let cached: BillingStatusResponse | null = null;
let inflight: Promise<BillingStatusResponse | null> | null = null;
const subscribers = new Set<() => void>();

function notifySubscribers() {
  subscribers.forEach((fn) => fn());
}

function invalidate() {
  cached = null;
  inflight = null;
  notifySubscribers();
}

async function fetchBillingStatus(): Promise<BillingStatusResponse | null> {
  if (cached) return cached;
  if (inflight) return inflight;
  inflight = (async () => {
    try {
      const response = await fetch("/api/billing/status");
      if (!response.ok) {
        return null;
      }
      const data = (await response.json()) as BillingStatusResponse;
      cached = data;
      return data;
    } catch (err) {
      console.error("Memora: useBillingStatus fetch failed", err);
      return null;
    } finally {
      inflight = null;
      notifySubscribers();
    }
  })();
  return inflight;
}

export function useBillingStatus(): State & { refetch: () => Promise<void> } {
  const { onboarding } = useMemoraStore();
  const [state, setState] = useState<State>(() => ({
    status: cached,
    loading: cached === null,
    error: null,
  }));

  const refetch = async () => {
    if (!onboarding.isAuthenticated) {
      setState({ status: null, loading: false, error: null });
      return;
    }
    setState((s) => ({ ...s, loading: cached === null }));
    const data = await fetchBillingStatus();
    setState({
      status: data,
      loading: false,
      error: data ? null : "Could not load billing status.",
    });
  };

  useEffect(() => {
    // Subscribe to invalidations from other consumers.
    const onChange = () => {
      setState({ status: cached, loading: cached === null, error: null });
    };
    subscribers.add(onChange);

    void refetch();

    // Re-fetch shortly after Stripe redirect so the webhook has time to land.
    let timeoutId: number | null = null;
    if (typeof window !== "undefined") {
      const params = new URLSearchParams(window.location.search);
      if (params.get("checkout") === "success") {
        timeoutId = window.setTimeout(() => {
          invalidate();
          void refetch();
        }, 1500);
      }
    }

    return () => {
      subscribers.delete(onChange);
      if (timeoutId !== null) window.clearTimeout(timeoutId);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [onboarding.isAuthenticated]);

  // Flush the cache when authentication changes — different user, fresh
  // data. This runs in addition to the refetch above; the invalidate()
  // call ensures any stale cached value from the previous user is
  // replaced rather than briefly displayed.
  useEffect(() => {
    invalidate();
  }, [onboarding.user?.id]);

  return { ...state, refetch };
}
