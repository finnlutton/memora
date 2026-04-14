export type MembershipPlanId = "free" | "lite" | "plus" | "pro";
export type PlanResource = "galleries" | "subgalleries" | "photos" | "shares";

export type MembershipPlan = {
  id: MembershipPlanId;

  name: string;
  priceMonthlyLabel: string;
  /**
   * Annual billing amount used by the existing checkout prototype.
   */
  price: number;

  galleryCount: number;
  subgalleriesPerGallery: number;
  photosPerSubgallery: number;
  activeShareLinks: number | null;

  summary: string;
  features: string[];

  /**
   * Used on the pricing page: Plus is the visual anchor.
   */
  featured?: boolean;

  /**
   * Used by checkout summary UI (front-end prototype).
   */
  effectiveCost: string;
};

export type PlanLimitValue = number | null;

function annualPriceFromMonthly(priceMonthly: number) {
  return Math.round(priceMonthly * 12 * 100) / 100;
}

function dollars(value: number) {
  return value.toLocaleString("en", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

function formatGalleryCount(n: number) {
  return n === 1 ? "1 gallery" : `${n} galleries`;
}

export const membershipPlans: MembershipPlan[] = [
  {
    id: "free",
    name: "Free",
    priceMonthlyLabel: "$0/month",
    price: annualPriceFromMonthly(0),
    galleryCount: 2,
    subgalleriesPerGallery: 3,
    photosPerSubgallery: 15,
    activeShareLinks: 3,
    summary: "Try Memora",
    features: [
      formatGalleryCount(2),
      "3 subgalleries per gallery",
      "15 photos per subgallery",
      "3 active share links",
    ],
    featured: false,
    effectiveCost: `$${dollars(0)}`,
  },
  {
    id: "lite",
    name: "Lite",
    priceMonthlyLabel: "$1.49/month",
    price: annualPriceFromMonthly(1.49),
    galleryCount: 6,
    subgalleriesPerGallery: 5,
    photosPerSubgallery: 25,
    activeShareLinks: 10,
    summary: "For a few meaningful moments",
    features: [
      formatGalleryCount(6),
      "5 subgalleries per gallery",
      "25 photos per subgallery",
      "10 active share links",
    ],
    featured: false,
    effectiveCost: `$${dollars(annualPriceFromMonthly(1.49) / 6)}`,
  },
  {
    id: "plus",
    name: "Plus",
    priceMonthlyLabel: "$4.99/month",
    price: annualPriceFromMonthly(4.99),
    galleryCount: 40,
    subgalleriesPerGallery: 15,
    photosPerSubgallery: 40,
    activeShareLinks: null,
    summary: "Best for most travelers",
    features: [
      formatGalleryCount(40),
      "15 subgalleries per gallery",
      "40 photos per subgallery",
      "Unlimited sharing",
    ],
    featured: true,
    effectiveCost: `$${dollars(annualPriceFromMonthly(4.99) / 40)}`,
  },
  {
    id: "pro",
    name: "Pro",
    priceMonthlyLabel: "$7.99/month",
    price: annualPriceFromMonthly(7.99),
    galleryCount: Number.POSITIVE_INFINITY,
    subgalleriesPerGallery: Number.POSITIVE_INFINITY,
    photosPerSubgallery: Number.POSITIVE_INFINITY,
    activeShareLinks: null,
    summary: "For long-term archiving and power users",
    features: [
      "Unlimited galleries",
      "Unlimited sharing",
      "Higher limits everywhere",
      "Priority performance",
      "Future premium features",
    ],
    featured: false,
    effectiveCost: "Custom",
  },
];

export function normalizePlanId(value: string | null | undefined): MembershipPlanId {
  const normalized = value?.trim().toLowerCase();
  if (normalized === "lite" || normalized === "plus" || normalized === "pro") {
    return normalized;
  }
  return "free";
}

export function isUnlimited(value: PlanLimitValue) {
  return value == null || !Number.isFinite(value);
}

export function getPlanLimit(plan: MembershipPlan, resource: PlanResource): PlanLimitValue {
  if (resource === "galleries") return plan.galleryCount;
  if (resource === "subgalleries") return plan.subgalleriesPerGallery;
  if (resource === "photos") return plan.photosPerSubgallery;
  return plan.activeShareLinks;
}

export function canCreate(resource: PlanResource, currentUsage: number, plan: MembershipPlan) {
  const limit = getPlanLimit(plan, resource);
  if (isUnlimited(limit)) {
    return { allowed: true as const, limit };
  }
  return {
    allowed: currentUsage < limit,
    limit,
  };
}

export function getMembershipPlan(planId: MembershipPlanId | null) {
  const normalized = normalizePlanId(planId);
  return membershipPlans.find((plan) => plan.id === normalized) ?? membershipPlans[0] ?? null;
}
