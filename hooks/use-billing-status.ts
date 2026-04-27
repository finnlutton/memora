"use client";

import { useEffect, useState } from "react";
import type { BillingStatusResponse } from "@/app/api/billing/status/route";
import { useMemoraStore } from "@/hooks/use-memora-store";

/**
 * Single-fetch hook for the user's Stripe + plan billing state.
 *
 * Lives on the client; calls /api/billing/status once when the user is
 * authenticated. Shared by the BillingStatusCard and the plan-aware
 * pricing buttons so both stay in sync without prop-drilling.
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

export function useBillingStatus(): State & { refetch: () => Promise<void> } {
  const { onboarding } = useMemoraStore();
  const [state, setState] = useState<State>({
    status: null,
    loading: true,
    error: null,
  });

  const refetch = async () => {
    if (!onboarding.isAuthenticated) {
      setState({ status: null, loading: false, error: null });
      return;
    }
    try {
      const response = await fetch("/api/billing/status");
      if (!response.ok) {
        const data = (await response.json().catch(() => ({}))) as {
          error?: string;
        };
        setState({
          status: null,
          loading: false,
          error: data.error ?? "Could not load billing status.",
        });
        return;
      }
      const data = (await response.json()) as BillingStatusResponse;
      setState({ status: data, loading: false, error: null });
    } catch (err) {
      console.error("Memora: useBillingStatus fetch failed", err);
      setState({
        status: null,
        loading: false,
        error: "Could not load billing status.",
      });
    }
  };

  useEffect(() => {
    void refetch();
    // Re-fetch shortly after Stripe redirect so the webhook has time to land.
    if (typeof window !== "undefined") {
      const params = new URLSearchParams(window.location.search);
      if (params.get("checkout") === "success") {
        const id = window.setTimeout(() => void refetch(), 1500);
        return () => window.clearTimeout(id);
      }
    }
    return;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [onboarding.isAuthenticated]);

  return { ...state, refetch };
}
