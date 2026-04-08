import type { MembershipPlanId } from "@/lib/plans";

export type MembershipState = {
  selectedPlanId: MembershipPlanId | null;
  onboardingComplete: boolean;
};

export type AuthenticatedRouteState = MembershipState & {
  welcomeStepCompleted: boolean;
};

export type AuthUserLike = {
  id?: string;
  email?: string | null;
  user_metadata?: Record<string, unknown> | null;
} | null;

export function createMembershipState(selectedPlanId: MembershipPlanId | null): MembershipState {
  return {
    selectedPlanId,
    onboardingComplete: Boolean(selectedPlanId),
  };
}

export function getNextAuthenticatedRoute(state: AuthenticatedRouteState) {
  if (!state.welcomeStepCompleted) {
    return "/welcome";
  }

  if (!state.selectedPlanId) {
    return "/pricing";
  }

  return "/galleries";
}
