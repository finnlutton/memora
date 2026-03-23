export type MembershipPlan = {
  id: "focus" | "regular" | "archive";
  galleryCount: number;
  price: number;
  effectiveCost: string;
  summary: string;
  recommended?: boolean;
};

export const membershipPlans: MembershipPlan[] = [
  {
    id: "focus",
    galleryCount: 5,
    price: 19,
    effectiveCost: "$3.80",
    summary: "For a focused personal archive",
  },
  {
    id: "regular",
    galleryCount: 20,
    price: 49,
    effectiveCost: "$2.45",
    summary: "For regular use across trips, seasons, and milestones",
    recommended: true,
  },
  {
    id: "archive",
    galleryCount: 35,
    price: 79,
    effectiveCost: "$2.26",
    summary: "For a fuller long-term archive",
  },
];

export function getMembershipPlan(planId: MembershipPlan["id"] | null) {
  return membershipPlans.find((plan) => plan.id === planId) ?? null;
}
