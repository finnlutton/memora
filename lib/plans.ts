/**
 * Centralized plan config — the single source of truth for everything
 * about Memora's billing tiers.
 *
 * Public plans:        free, abroad_pass, memora_pass
 * Hidden plans:        plus     (legacy recurring monthly — retired)
 *                      lifetime (legacy one-time 3-year "Max" — retired)
 *                      max      (older legacy recurring "Max" — retired
 *                                even before lifetime took the slot)
 * Internal-only plan:  internal (full-access, never shown publicly)
 *
 * Hidden plans stay in the config so `selected_plan` rows from existing
 * subscribers continue to resolve through normalizePlanId,
 * getStripePriceIdForPlan, and the Stripe webhook mapping. They are
 * filtered out of every public picker via `publicMembershipPlans`.
 *
 * Stripe price IDs are derived from env vars at the point of use; the
 * client only ever sends a `planId` string, which the server validates
 * against this config. This file is safe to import on both client and
 * server — env-var helpers are only invoked from server routes.
 */

export type MembershipPlanId =
  | "free"
  | "plus"
  | "abroad_pass"
  | "memora_pass"
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
  /**
   * Comped/internal-only — never shown publicly and never charged. The
   * runtime resolver uses the `is_internal_account` profile flag, this
   * field just keeps the plan out of the public picker.
   */
  internal?: boolean;
  /**
   * Hidden from the public pricing/picker UI but still a real backend
   * plan. Used for retired plans we keep for legacy subscribers (Max)
   * so existing customers keep working without us advertising it.
   */
  hidden?: boolean;
  /** Display label inside the checkout summary UI. */
  effectiveCost: string;
  /**
   * Stripe billing mode for this plan. Only relevant for paid plans.
   *   "subscription" → recurring (Plus, Max)
   *   "payment"      → one-time (Max, Abroad Pass)
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
    galleryCount: 1,
    subgalleriesPerGallery: 3,
    photosPerSubgallery: 10,
    directPhotosPerGallery: 10,
    activeShareLinks: 1,
    shareLimitPeriod: "lifetime",
    summary: "A quiet way to start your archive.",
    features: [
      formatGalleryCount(1),
      "1 private share link",
    ],
    featured: false,
    effectiveCost: `$${dollars(0)}`,
  },
  {
    id: "abroad_pass",
    name: "Abroad Pass",
    priceMonthlyLabel: "$12.99",
    // Annual-equivalent isn't meaningful for a one-time 6-month pass;
    // store the actual cost so the checkout summary renders correctly.
    price: 12.99,
    galleryCount: 100,
    subgalleriesPerGallery: 50,
    photosPerSubgallery: 200,
    directPhotosPerGallery: 200,
    activeShareLinks: 60,
    shareLimitPeriod: "monthly",
    summary: "One upfront payment. Six months of creation access.",
    features: [
      "6 months of creation access",
      "Premium gallery and sharing limits",
      "Galleries stay viewable after the term ends",
      "One payment, no renewal",
    ],
    featured: false,
    effectiveCost: "Abroad Pass",
    stripeMode: "payment",
  },
  {
    id: "memora_pass",
    name: "Memora Pass",
    priceMonthlyLabel: "$19.99",
    // One-time annual pass — store the actual cost so the checkout
    // summary renders correctly.
    price: 19.99,
    galleryCount: 100,
    subgalleriesPerGallery: 50,
    photosPerSubgallery: 200,
    directPhotosPerGallery: 200,
    activeShareLinks: 60,
    shareLimitPeriod: "monthly",
    summary: "Pay once. A full year of premium access, no auto-renewal.",
    features: [
      "1 year of premium access",
      "Premium gallery and sharing limits",
      "One payment, no renewal",
      "Galleries stay viewable after the term ends",
    ],
    featured: true,
    effectiveCost: "Memora Pass",
    stripeMode: "payment",
  },
  {
    id: "plus",
    name: "Plus (Legacy)",
    priceMonthlyLabel: "$1.99",
    price: annualPriceFromMonthly(1.99),
    galleryCount: 20,
    subgalleriesPerGallery: 10,
    photosPerSubgallery: 40,
    directPhotosPerGallery: 40,
    activeShareLinks: 12,
    shareLimitPeriod: "monthly",
    summary: "Legacy recurring Plus plan retained for existing subscribers.",
    features: [
      formatGalleryCount(20),
      "12 private share links per month",
    ],
    featured: false,
    // Retired recurring monthly plan. Hidden from all public/upgrade UI
    // but still resolves through normalizePlanId, getStripePriceIdForPlan,
    // and the Stripe webhook mapping so any pre-2026-05 Plus subscribers
    // keep functioning until they cancel or switch.
    hidden: true,
    effectiveCost: `$${dollars(annualPriceFromMonthly(1.99) / 20)}`,
    stripeMode: "subscription",
  },
  {
    id: "lifetime",
    name: "Max (3-year, Legacy)",
    priceMonthlyLabel: "$39.99",
    // One-time 3-year pass — annual-equivalent isn't meaningful; store
    // the actual cost so the checkout summary renders correctly.
    price: 39.99,
    galleryCount: 100,
    subgalleriesPerGallery: 50,
    photosPerSubgallery: 200,
    directPhotosPerGallery: 200,
    activeShareLinks: 60,
    shareLimitPeriod: "monthly",
    summary: "Legacy 3-year Max pass retained for existing buyers.",
    features: [
      "3 years of premium access",
      "Premium gallery and sharing limits",
      "One payment, no renewal",
      "Galleries stay viewable after the term ends",
    ],
    featured: false,
    // Retired one-time 3-year plan. Hidden from all public/upgrade UI
    // but still resolves through normalizePlanId, getStripePriceIdForPlan,
    // and the Stripe webhook mapping so existing 3-year buyers keep
    // their access window intact.
    hidden: true,
    effectiveCost: "Max",
    stripeMode: "payment",
  },
  {
    id: "max",
    name: "Max (Legacy)",
    priceMonthlyLabel: "$5.99",
    price: annualPriceFromMonthly(5.99),
    galleryCount: UNLIMITED,
    subgalleriesPerGallery: UNLIMITED,
    photosPerSubgallery: UNLIMITED,
    directPhotosPerGallery: UNLIMITED,
    activeShareLinks: null,
    summary: "Legacy recurring Max plan retained for existing subscribers.",
    features: [
      "Unlimited galleries",
      "Unlimited sharing",
      "Higher limits all around",
      "Early access to new features",
    ],
    featured: false,
    // Retired plan kept for backward compatibility with the original
    // recurring Max subscribers (pre-2026-05). The current "Max" tier is
    // the one-time `lifetime` plan above. Hidden from all public/upgrade
    // UI but still resolves through normalizePlanId,
    // getStripePriceIdForPlan, and the webhook mapping so existing subs
    // keep functioning.
    hidden: true,
    effectiveCost: "Custom",
    stripeMode: "subscription",
  },
  {
    id: "internal",
    name: "Full Access",
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
  "abroad_pass",
  "memora_pass",
  "max",
  "lifetime",
  "internal",
]);

/**
 * Coerce any input string into a valid MembershipPlanId. Old plan IDs from
 * pre-Stripe versions ("lite", "pro") are remapped: lite→free (downgrade,
 * Lite is gone) and pro→max (renamed). Hyphenated/spaced variants of the
 * Abroad Pass and Memora Pass ("abroad-pass", "memora pass", etc.) are
 * tolerated. Unknown values fall back to free.
 */
export function normalizePlanId(value: string | null | undefined): MembershipPlanId {
  const normalized = value?.trim().toLowerCase();
  if (!normalized) return "free";
  if (normalized === "pro") return "max";
  if (normalized === "lite") return "free";
  if (
    normalized === "abroad-pass" ||
    normalized === "abroad pass" ||
    normalized === "abroadpass"
  ) {
    return "abroad_pass";
  }
  if (
    normalized === "memora-pass" ||
    normalized === "memora pass" ||
    normalized === "memorapass"
  ) {
    return "memora_pass";
  }
  if (KNOWN_PLAN_IDS.has(normalized as MembershipPlanId)) {
    return normalized as MembershipPlanId;
  }
  return "free";
}

export function isUnlimited(value: PlanLimitValue) {
  return value == null || value >= UNLIMITED;
}

export function isPaidPlan(planId: MembershipPlanId): boolean {
  return (
    planId === "plus" ||
    planId === "abroad_pass" ||
    planId === "memora_pass" ||
    planId === "max" ||
    planId === "lifetime"
  );
}

/**
 * One-time/non-recurring paid plans — stored against
 * `subscription_current_period_end` with no Stripe subscription, and
 * resolved to "free" once the access window has elapsed.
 */
export function isOneTimePlan(planId: MembershipPlanId): boolean {
  return (
    planId === "abroad_pass" ||
    planId === "memora_pass" ||
    planId === "lifetime"
  );
}

export function isInternalPlan(planId: MembershipPlanId): boolean {
  return planId === "internal";
}

/**
 * Max Plan term, in milliseconds (3 years). Used by the Stripe webhook
 * to stamp `subscription_current_period_end` at purchase time and by
 * the runtime resolver below to check whether that stamp is in the past.
 *
 * 3 calendar years is approximated as 3 × 365.25 days. Drift over a
 * 3-year window from leap-day rounding is < 1 day, which is acceptable
 * for an access-window check that's already enforced loosely.
 */
export const MAX_TERM_MS = 3 * 365.25 * 24 * 60 * 60 * 1000;

/**
 * Abroad Pass term, in milliseconds (≈ 6 months / 183 days). Approximated
 * as 6 × 30.5 days for the same simple-arithmetic reason as
 * MAX_TERM_MS — drift is well under a day across the 6-month window.
 */
export const ABROAD_PASS_TERM_MS = 6 * 30.5 * 24 * 60 * 60 * 1000;

/**
 * Memora Pass term, in milliseconds (1 year). Used by the Stripe webhook
 * to stamp `subscription_current_period_end` at purchase time. After that
 * timestamp passes, `resolveEffectivePlanId` silently drops the user to
 * Free for any limit check or UI gate.
 */
export const MEMORA_PASS_TERM_MS = 365.25 * 24 * 60 * 60 * 1000;

/**
 * Compute when a Max Plan purchase made now will expire. Returns an
 * ISO string suitable for the `subscription_current_period_end` column.
 */
export function computeMaxExpiry(purchasedAt: Date = new Date()): string {
  return new Date(purchasedAt.getTime() + MAX_TERM_MS).toISOString();
}

/**
 * Compute when an Abroad Pass purchase made now will expire. Returns an
 * ISO string for `subscription_current_period_end`; once that time
 * passes, `resolveEffectivePlanId` silently downgrades the user to Free.
 */
export function computeAbroadPassExpiry(purchasedAt: Date = new Date()): string {
  return new Date(purchasedAt.getTime() + ABROAD_PASS_TERM_MS).toISOString();
}

/**
 * Compute when a Memora Pass purchase made now will expire. Returns an
 * ISO string for `subscription_current_period_end`; once that time
 * passes, `resolveEffectivePlanId` silently downgrades the user to Free.
 */
export function computeMemoraPassExpiry(purchasedAt: Date = new Date()): string {
  return new Date(purchasedAt.getTime() + MEMORA_PASS_TERM_MS).toISOString();
}

/**
 * Stamp the appropriate one-time-plan expiry timestamp. Centralized so
 * the webhook handler doesn't need to know the term length per plan.
 */
export function computeOneTimePlanExpiry(
  planId: MembershipPlanId,
  purchasedAt: Date = new Date(),
): string | null {
  if (planId === "lifetime") return computeMaxExpiry(purchasedAt);
  if (planId === "abroad_pass") return computeAbroadPassExpiry(purchasedAt);
  if (planId === "memora_pass") return computeMemoraPassExpiry(purchasedAt);
  return null;
}

export type ProfilePlanFields = {
  selected_plan: string | null;
  is_internal_account: boolean | null;
  subscription_current_period_end: string | null;
};

/**
 * Resolves the *effective* plan id for a profile, accounting for
 * one-time-plan expiry.
 *
 *   - Memora Pass     ($19.99 / 1 yr)     → `selected_plan = "memora_pass"`
 *   - Abroad Pass     ($12.99 / 6 months) → `selected_plan = "abroad_pass"`
 *   - Max (legacy)    ($39.99 / 3 yrs)    → `selected_plan = "lifetime"`
 *
 * Each stamps the access end into `subscription_current_period_end`.
 * Once that timestamp is in the past, the user silently drops to Free
 * for any limit check or UI gate — the row is left intact so an audit
 * trail survives (and so the UI can show "your Memora Pass has ended"
 * rather than a generic Free state).
 *
 * Internal/comped accounts always resolve to `internal` regardless of
 * the stored plan. Recurring subscriptions (legacy plus, legacy max)
 * ignore the end-date check; their lifecycle is governed by Stripe
 * events.
 */
export function resolveEffectivePlanId(
  profile: ProfilePlanFields | null | undefined,
): MembershipPlanId {
  if (profile?.is_internal_account) return "internal";
  const planId = normalizePlanId(profile?.selected_plan ?? null);
  if (!isOneTimePlan(planId)) return planId;
  const endsAt = profile?.subscription_current_period_end;
  if (!endsAt) return planId;
  const expiresAt = new Date(endsAt);
  if (Number.isNaN(expiresAt.getTime())) return planId;
  return expiresAt.getTime() < Date.now() ? "free" : planId;
}

function isOneTimePlanExpired(
  profile: ProfilePlanFields | null | undefined,
  expectedPlan: MembershipPlanId,
): boolean {
  if (profile?.is_internal_account) return false;
  if (normalizePlanId(profile?.selected_plan ?? null) !== expectedPlan) return false;
  const endsAt = profile?.subscription_current_period_end;
  if (!endsAt) return false;
  const expiresAt = new Date(endsAt);
  if (Number.isNaN(expiresAt.getTime())) return false;
  return expiresAt.getTime() < Date.now();
}

/**
 * True when the profile is an expired Max Plan account — useful for
 * surfacing a "Max access ended" UI state without losing the
 * historical fact that the account was once on Max.
 */
export function isMaxExpired(
  profile: ProfilePlanFields | null | undefined,
): boolean {
  return isOneTimePlanExpired(profile, "lifetime");
}

/**
 * True when the profile is an expired Abroad Pass account — used to
 * render the warm "your Abroad Pass period has ended" state in the
 * settings UI (galleries stay viewable, new uploads require an active
 * plan).
 */
export function isAbroadPassExpired(
  profile: ProfilePlanFields | null | undefined,
): boolean {
  return isOneTimePlanExpired(profile, "abroad_pass");
}

/**
 * True when the profile holds an Abroad Pass that has not yet expired.
 * Read by settings UI to swap "Active until [date]" copy for the
 * normal recurring-subscription row.
 */
export function isAbroadPassActive(
  profile: ProfilePlanFields | null | undefined,
): boolean {
  if (profile?.is_internal_account) return false;
  if (normalizePlanId(profile?.selected_plan ?? null) !== "abroad_pass") return false;
  const endsAt = profile?.subscription_current_period_end;
  if (!endsAt) return false;
  const expiresAt = new Date(endsAt);
  if (Number.isNaN(expiresAt.getTime())) return false;
  return expiresAt.getTime() >= Date.now();
}

/**
 * True when the profile is an expired Memora Pass account — used to
 * render the "your Memora Pass has ended" state in the settings UI
 * (galleries stay viewable, new uploads require an active plan).
 */
export function isMemoraPassExpired(
  profile: ProfilePlanFields | null | undefined,
): boolean {
  return isOneTimePlanExpired(profile, "memora_pass");
}

/**
 * True when the profile holds a Memora Pass that has not yet expired.
 * Read by settings UI to render the active-until copy.
 */
export function isMemoraPassActive(
  profile: ProfilePlanFields | null | undefined,
): boolean {
  if (profile?.is_internal_account) return false;
  if (normalizePlanId(profile?.selected_plan ?? null) !== "memora_pass") return false;
  const endsAt = profile?.subscription_current_period_end;
  if (!endsAt) return false;
  const expiresAt = new Date(endsAt);
  if (Number.isNaN(expiresAt.getTime())) return false;
  return expiresAt.getTime() >= Date.now();
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
 * Public plans for the pricing grid — anything `internal` (comped) or
 * `hidden` (legacy/retired) is filtered out so it never appears as a
 * buyable card. Today this is Free, Abroad Pass, Memora Pass.
 */
export const publicMembershipPlans: MembershipPlan[] = membershipPlans.filter(
  (plan) => !plan.internal && !plan.hidden,
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
        : planId === "abroad_pass"
          ? "STRIPE_ABROAD_PASS_PRICE_ID"
          : planId === "memora_pass"
            ? "STRIPE_MEMORA_PASS_PRICE_ID"
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
  if (priceId === process.env.STRIPE_ABROAD_PASS_PRICE_ID) return "abroad_pass";
  if (priceId === process.env.STRIPE_MEMORA_PASS_PRICE_ID) return "memora_pass";
  return null;
}
