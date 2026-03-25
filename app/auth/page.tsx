"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { AuthCard } from "@/components/onboarding/auth-card";
import { useMemoraStore } from "@/hooks/use-memora-store";

export default function AuthPage() {
  const router = useRouter();
  const { hydrated, onboarding, getNextOnboardingRoute } = useMemoraStore();

  useEffect(() => {
    if (!hydrated || !onboarding.isAuthenticated) {
      return;
    }
    router.replace(onboarding.onboardingComplete ? "/galleries" : getNextOnboardingRoute());
  }, [
    getNextOnboardingRoute,
    hydrated,
    onboarding.isAuthenticated,
    onboarding.onboardingComplete,
    router,
  ]);

  return <AuthCard />;
}
