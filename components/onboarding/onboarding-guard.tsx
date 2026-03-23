"use client";

import { useEffect } from "react";
import { usePathname, useRouter } from "next/navigation";
import { useMemoraStore } from "@/hooks/use-memora-store";

export function OnboardingGuard({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const { hydrated, onboarding, getNextOnboardingRoute } = useMemoraStore();

  useEffect(() => {
    if (!hydrated || onboarding.onboardingComplete) {
      return;
    }

    const nextRoute = getNextOnboardingRoute();
    if (pathname !== nextRoute) {
      router.replace(nextRoute);
    }
  }, [getNextOnboardingRoute, hydrated, onboarding.onboardingComplete, pathname, router]);

  if (!hydrated || !onboarding.onboardingComplete) {
    return null;
  }

  return <>{children}</>;
}
