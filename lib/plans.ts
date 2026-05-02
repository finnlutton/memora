/**
 * Centralized plan config — the single source of truth for everything
 * about Memora's billing tiers.
 *
 * Public plans:        free, plus, max, lifetime
 * Internal-only plan:  internal  (founder/full-access, never shown publicly)
 *
 * Stripe price IDs are derived from env vars at the point of use; the
 * client only ever sends a `planId` string, which the server validates
 * against this config. This file is safe to import on both client and
 * server — env-var helpers are only invoked from server routes.
 */

export type MembershipPlanId =
  | "free"
  | "plus"
  | "max"
  | "lifetime"
  | "internal";

export type PlanResource =
  | "galleries"
  | "subgalleries"
  | "photos"
  | "directPhotos"
  | "shares";

export type MembershipPlan = {
  id: MembershipPlanId;
  name: string;
  priceMonthlyLabel: string;
  /** Annual billing amount used by the existing checkout summary UI. */
  price: number;
  galleryCount: number;
  subgalleriesPerGallery: number;
  photosPerSubgallery: number;
  /** Limit for photos uploaded directly to a gallery (no subgallery). */
  directPhotosPerGallery: number;
  /** null = unlimited */
  activeShareLinks: number | null;
  /**
   * Window over which `activeShareLinks` is measured.
   *   "lifetime" — count every share the user has ever created
   *                (revoked or not), so revoking does not free up
   *                headroom.
   *   "monthly"  — count shares created since the start of the
   *                current calendar month (UTC). Resets on the 1st.
   * Omitted for plans where `activeShareLinks` is null/unlimited.
   */
  shareLimitPeriod?: "lifetime" | "monthly";
  summary: string;
  features: string[];
  /** Pricing page accent. */
  featured?: boolean;
  /** Hidden from the public pricing grid. */
  internal?: boolean;
  /** Display label inside the checkout summary UI. */
  effectiveCost: string;
  /**
   * Stripe billing mode for this plan. Only relevant for paid plans.
   *   "subscription" → recurring (Plus, Max)
   *   "payment"      → one-time (Lifetime)
   */
  stripeMode?: "subscription" | "payment";
};

export type PlanLimitValue = number | null;

// Sentinel for "effectively unlimited" — see spec note about avoiding Infinity.
const UNLIMITED = 999_999;

function annualPriceFromMonthly(priceMonthly: number) {
  return Math.round(priceMonthly * 12 * 100) / 100;
}

function dollars(value: number) {
  return value.toLocaleString("en", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

function formatGalleryCount(n: number) {
  return n === 1 ? "1 gallery" : `${n} galleries`;
}

export const membershipPlans: MembershipPlan[] = [
  {
    id: "free",
    name: "Free",
    priceMonthlyLabel: "$0",
    price: annualPriceFromMonthly(0),
    galleryCount: 2,
    subgalleriesPerGallery: 3,
    photosPerSubgallery: 15,
    directPhotosPerGallery: 15,
    activeShareLinks: 3,
    shareLimitPeriod: "lifetime",
    summary: "A quiet way to start your archive.",
    features: [
      formatGalleryCount(2),
      "3 private share links",
    ],
    featured: false,
    effectiveCost: `$${dollars(0)}`,
  },
  {
    id: "plus",
    name: "Plus",
    priceMonthlyLabel: "$1.99",
    price: annualPriceFromMonthly(1.99),
    galleryCount: 20,
    subgalleriesPerGallery: 10,
    photosPerSubgallery: 40,
    directPhotosPerGallery: 40,
    activeShareLinks: 12,
    shareLimitPeriod: "monthly",
    summary: "Built for travelers and families keeping things in one place.",
    features: [
      formatGalleryCount(20),
      "12 private share links per month",
    ],
    featured: true,
    effectiveCost: `$${dollars(annualPriceFromMonthly(1.99) / 20)}`,
    stripeMode: "subscription",
  },
  {
    id: "max",
    name: "Max",
    priceMonthlyLabel: "$5.99",
    price: annualPriceFromMonthly(5.99),
    galleryCount: UNLIMITED,
    subgalleriesPerGallery: UNLIMITED,
    photosPerSubgallery: UNLIMITED,
    directPhotosPerGallery: UNLIMITED,
    activeShareLinks: null,
    summary: "For long-term archivists building a life's worth of memories.",
    features: [
      "Unlimited galleries",
      "Unlimited sharing",
      "Higher limits all around",
      "Early access to new features",
    ],
    featured: false,
    effectiveCost: "Custom",
    stripeMode: "subscription",
  },
  {
    id: "lifetime",
    name: "Lifetime",
    priceMonthlyLabel: "$49.99",
    price: 49.99,
    galleryCount: UNLIMITED,
    subgalleriesPerGallery: UNLIMITED,
    photosPerSubgallery: UNLIMITED,
    directPhotosPerGallery: UNLIMITED,
    activeShareLinks: null,
    summary: "Pay once. Keep Max-level access for life.",
    features: [
      "Everything in Max — forever",
      "One payment, no renewals",
      "Founding-supporter pricing",
    ],
    featured: false,
    effectiveCost: "Lifetime",
    stripeMode: "payment",
  },
  {
    id: "internal",
    name: "Founder",
    priceMonthlyLabel: "Comped",
    price: 0,
    galleryCount: UNLIMITED,
    subgalleriesPerGallery: UNLIMITED,
    photosPerSubgallery: UNLIMITED,
    directPhotosPerGallery: UNLIMITED,
    activeShareLinks: null,
    summary: "Full-access internal account.",
    features: ["Unlimited everything", "No billing required"],
    featured: false,
    internal: true,
    effectiveCost: "—",
  },
];

const KNOWN_PLAN_IDS = new Set<MembershipPlanId>([
  "free",
  "plus",
  "max",
  "lifetime",
  "internal",
]);

/**
 * Coerce any input string into a valid MembershipPlanId. Old plan IDs from
 * pre-Stripe versions ("lite", "pro") are remapped: lite→free (downgrade,
 * Lite is gone) and pro→max (renamed). Unknown values fall back to free.
 */
export function normalizePlanId(value: string | null | undefined): MembershipPlanId {
  const normalized = value?.trim().toLowerCase();
  if (!normalized) return "free";
  if (normalized === "pro") return "max";
  if (normalized === "lite") return "free";
  if (KNOWN_PLAN_IDS.has(normalized as MembershipPlanId)) {
    return normalized as MembershipPlanId;
  }
  return "free";
}

export function isUnlimited(value: PlanLimitValue) {
  return value == null || value >= UNLIMITED;
}

export function isPaidPlan(planId: MembershipPlanId): boolean {
  return planId === "plus" || planId === "max" || planId === "lifetime";
}

export function isInternalPlan(planId: MembershipPlanId): boolean {
  return planId === "internal";
}

export function getPlan(planId: MembershipPlanId): MembershipPlan {
  return (
    membershipPlans.find((plan) => plan.id === planId) ?? membershipPlans[0]!
  );
}

/** Back-compat alias used widely across the codebase. */
export function getMembershipPlan(planId: MembershipPlanId | null) {
  return getPlan(normalizePlanId(planId));
}

export function getPlanLimits(planId: MembershipPlanId): MembershipPlan {
  return getPlan(planId);
}

export function getPlanLimit(plan: MembershipPlan, resource: PlanResource): PlanLimitValue {
  if (resource === "galleries") return plan.galleryCount;
  if (resource === "subgalleries") return plan.subgalleriesPerGallery;
  if (resource === "photos") return plan.photosPerSubgallery;
  if (resource === "directPhotos") return plan.directPhotosPerGallery;
  return plan.activeShareLinks;
}

export function canCreate(
  resource: PlanResource,
  currentUsage: number,
  plan: MembershipPlan,
) {
  const limit = getPlanLimit(plan, resource);
  if (limit === null) {
    return { allowed: true as const, limit: null };
  }
  if (limit >= UNLIMITED) {
    return { allowed: true as const, limit: null };
  }
  return {
    allowed: currentUsage < limit,
    limit,
  };
}

const PLAN_LIMIT_PREFIX = "PLAN_LIMIT_REACHED:";

const RESOURCE_LABEL: Record<string, string> = {
  galleries: "gallery",
  subgalleries: "subgallery",
  photos: "photo",
  directPhotos: "photo",
  shares: "share-link",
};

/**
 * Detects the `PLAN_LIMIT_REACHED:<resource>` exception raised by the
 * Postgres BEFORE INSERT triggers (see migrations/...plan_limit_*.sql)
 * and turns it into a user-readable Error. Returns null if the input
 * isn't a trigger error, so callers can rethrow the original.
 */
export function translatePlanLimitError(error: unknown): Error | null {
  const message =
    error instanceof Error
      ? error.message
      : typeof (error as { message?: unknown })?.message === "string"
        ? (error as { message: string }).message
        : "";
  if (!message.startsWith(PLAN_LIMIT_PREFIX)) return null;
  const resource = message.slice(PLAN_LIMIT_PREFIX.length);
  const label = RESOURCE_LABEL[resource] ?? "item";
  const friendly = new Error(
    `You've reached the ${label} limit on your current plan. Upgrade or remove items to continue.`,
  );
  // Preserve the machine-readable payload so callers that want to render
  // a custom upgrade CTA can still introspect.
  (friendly as Error & { code?: string; resource?: string }).code =
    "PLAN_LIMIT_REACHED";
  (friendly as Error & { code?: string; resource?: string }).resource = resource;
  return friendly;
}

/**
 * Public plans for the pricing grid — anything with `internal: true` is
 * filtered out so it never appears as a buyable option.
 */
export const publicMembershipPlans: MembershipPlan[] = membershipPlans.filter(
  (plan) => !plan.internal,
);

/**
 * Start of the current calendar month in UTC, as an ISO string.
 * Shared by share-usage counters that enforce monthly quotas.
 */
export function startOfCurrentMonthUtcIso(): string {
  const now = new Date();
  return new Date(
    Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1),
  ).toISOString();
}

/* ── Stripe price-id helpers (server-only callers) ─────────────────────── */

/**
 * Returns the Stripe Price ID for the given plan, reading from env vars.
 * Throws if the plan is paid but its env var is unset, or if called for a
 * plan that isn't billed by Stripe (free/internal).
 *
 * Must only be invoked in server contexts. The env vars are not prefixed
 * NEXT_PUBLIC_* so they are not exposed to the client.
 */
export function getStripePriceIdForPlan(planId: MembershipPlanId): string {
  if (!isPaidPlan(planId)) {
    throw new Error(`Plan "${planId}" is not a paid plan and has no Stripe price.`);
  }
  const envName =
    planId === "plus"
      ? "STRIPE_PRICE_PLUS_MONTHLY"
      : planId === "max"
        ? "STRIPE_PRICE_MAX_MONTHLY"
        : "STRIPE_PRICE_LIFETIME";
  const value = process.env[envName];
  if (!value) {
    throw new Error(`Missing Stripe price env var: ${envName}`);
  }
  return value;
}

/**
 * Reverse lookup — given a Stripe price ID, return the matching Memora
 * plan. Returns null when the price ID isn't one we recognize (e.g. an
 * archived legacy price still attached to an old subscription).
 */
export function mapStripePriceIdToPlan(priceId: string): MembershipPlanId | null {
  if (!priceId) return null;
  if (priceId === process.env.STRIPE_PRICE_PLUS_MONTHLY) return "plus";
  if (priceId === process.env.STRIPE_PRICE_MAX_MONTHLY) return "max";
  if (priceId === process.env.STRIPE_PRICE_LIFETIME) return "lifetime";
  return null;
}
