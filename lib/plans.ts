export type MembershipPlanId = "free" | "lite" | "plus" | "pro";

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
    galleryCount: 1,
    subgalleriesPerGallery: 2,
    photosPerSubgallery: 10,
    summary: "Good for trying Memora",
    features: [
      formatGalleryCount(1),
      "2 subgalleries per gallery",
      "10 photos per subgallery",
    ],
    featured: false,
    effectiveCost: `$${dollars(0)}`,
  },
  {
    id: "lite",
    name: "Lite",
    priceMonthlyLabel: "$1.49/month",
    price: annualPriceFromMonthly(1.49),
    galleryCount: 5,
    subgalleriesPerGallery: 5,
    photosPerSubgallery: 15,
    summary: "For a few meaningful moments",
    features: [
      formatGalleryCount(5),
      "5 subgalleries per gallery",
      "15 photos per subgallery",
    ],
    featured: false,
    effectiveCost: `$${dollars(annualPriceFromMonthly(1.99) / 5)}`,
  },
  {
    id: "plus",
    name: "Plus",
    priceMonthlyLabel: "$4.99/month",
    price: annualPriceFromMonthly(4.99),
    galleryCount: 15,
    subgalleriesPerGallery: 10,
    photosPerSubgallery: 25,
    summary: "Best for regular use across trips, milestones, and seasons",
    features: [
      formatGalleryCount(15),
      "10 subgalleries per gallery",
      "25 photos per subgallery",
    ],
    featured: true,
    effectiveCost: `$${dollars(annualPriceFromMonthly(4.99) / 15)}`,
  },
  {
    id: "pro",
    name: "Pro",
    priceMonthlyLabel: "$7.99/month",
    price: annualPriceFromMonthly(7.99),
    galleryCount: 50,
    subgalleriesPerGallery: 20,
    photosPerSubgallery: 100,
    summary: "For long-term archiving and power users",
    features: [
      formatGalleryCount(50),
      "20 subgalleries per gallery",
      "50 photos per subgallery",
      "Premium layouts",
      "Advanced sharing",
    ],
    featured: false,
    effectiveCost: `$${dollars(annualPriceFromMonthly(7.99) / 50)}`,
  },
];

export function getMembershipPlan(planId: MembershipPlanId | null) {
  return membershipPlans.find((plan) => plan.id === planId) ?? null;
}
