"use client";

import { useEffect } from "react";
import { AuthCard } from "@/components/onboarding/auth-card";
import { useMemoraStore } from "@/hooks/use-memora-store";

export default function AuthPage() {
  const { resetOnboarding } = useMemoraStore();

  useEffect(() => {
    resetOnboarding();
    // Only on mount — avoid re-running when signIn updates the store (which would undo auth)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return <AuthCard />;
}
