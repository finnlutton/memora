import type { MembershipPlanId } from "@/lib/plans";

export type MembershipState = {
  selectedPlanId: MembershipPlanId | null;
  onboardingComplete: boolean;
};

export type AuthenticatedRouteState = MembershipState & {
  welcomeStepCompleted: boolean;
  /**
   * Required: a user without a non-empty display name is held at the
   * /welcome step. This applies to brand-new sign-ups AND to existing
   * accounts that pre-date the display-name requirement, so anyone
   * missing a name on their next login is asked to set one.
   */
  displayName: string | null;
};

export type AuthUserLike = {
  id?: string;
  email?: string | null;
  user_metadata?: Record<string, unknown> | null;
} | null;

export function createMembershipState(selectedPlanId: MembershipPlanId | null): MembershipState {
  return {
    selectedPlanId,
    onboardingComplete: true,
  };
}

export function getNextAuthenticatedRoute(state: AuthenticatedRouteState) {
  // /welcome handles two gating concerns: the legacy "have they seen
  // the welcome screen" flag AND the new "do they have a display
  // name" requirement. Either missing piece routes the user back.
  if (!state.welcomeStepCompleted || !state.displayName) {
    return "/welcome";
  }
  return "/galleries";
}
