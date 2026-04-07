import { getMembershipPlan, type MembershipPlanId } from "@/lib/plans";

export const PLAN_METADATA_KEY = "memora_plan_id";
export const ONBOARDING_COMPLETE_METADATA_KEY = "memora_onboarding_complete";

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

export function readMembershipStateFromUser(user: AuthUserLike): MembershipState {
  const metadata = user?.user_metadata ?? {};
  const rawPlanId = metadata[PLAN_METADATA_KEY];
  const selectedPlanId =
    typeof rawPlanId === "string" && getMembershipPlan(rawPlanId as MembershipPlanId)
      ? (rawPlanId as MembershipPlanId)
      : null;

  const rawComplete = metadata[ONBOARDING_COMPLETE_METADATA_KEY];
  const onboardingComplete =
    typeof rawComplete === "boolean" ? rawComplete : Boolean(selectedPlanId);

  return {
    selectedPlanId,
    onboardingComplete: selectedPlanId ? onboardingComplete : false,
  };
}

export function getNextAuthenticatedRoute(state: AuthenticatedRouteState) {
  if (!state.welcomeStepCompleted) {
    return "/welcome";
  }

  if (!state.selectedPlanId) {
    return "/pricing";
  }

  if (!state.onboardingComplete) {
    return "/checkout";
  }

  return "/galleries";
}

export function buildMembershipMetadata(state: MembershipState) {
  return {
    [PLAN_METADATA_KEY]: state.selectedPlanId,
    [ONBOARDING_COMPLETE_METADATA_KEY]: state.onboardingComplete,
  };
}
