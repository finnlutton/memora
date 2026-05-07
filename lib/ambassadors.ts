import type Stripe from "stripe";
import { mapStripePriceIdToPlan, normalizePlanId } from "@/lib/plans";
import type { createSupabaseAdminClient } from "@/lib/supabase/admin";

/**
 * Ambassador commission ledger — Stripe webhook side.
 *
 * Each Memora ambassador has a Stripe Promotion Code (e.g. "ELI10").
 * When a successful payment uses that code, we record a `pending`
 * commission row equal to `commission_rate` × paid amount. Payouts are
 * not automated; admins reconcile from the admin panel and mark rows
 * as `paid`. Refunds before payout flip rows to `refunded`.
 *
 * All work runs through the Supabase admin (service-role) client. The
 * ambassador tables have RLS enabled with no client-side policies, so
 * service role is the only entry point. Admin pages reach this through
 * /api/admin/* routes that gate on isAdminEmail() before invoking.
 *
 * Idempotency note: callers do not need to dedup. The DB has partial
 * unique indexes on (session_id), (invoice_id), (payment_intent_id);
 * recording the same payment twice raises 23505 and we treat that as a
 * silent success. The webhook also dedups at the *event* level via the
 * stripe_processed_events table.
 */

type AdminClient = ReturnType<typeof createSupabaseAdminClient>;

const PG_UNIQUE_VIOLATION = "23505";

export type AmbassadorRow = {
  id: string;
  name: string;
  email: string | null;
  promotion_code: string;
  commission_rate: number;
  active: boolean;
};

/**
 * Resolve the Promotion Code object the customer actually used at
 * checkout. Returns null when no promo code applied. Stripe's session
 * shape:
 *   - `session.discounts[]` may carry the promotion_code as a string id
 *     OR an expanded object, depending on whether the receiver was
 *     created with `expand: ['discounts.promotion_code']`.
 *
 * Webhooks deliver a non-expanded session, so this helper retrieves
 * the session with the right `expand` from Stripe. Cheap (one API
 * call) and called only when at least one ambassador exists, which is
 * gated by the caller.
 */
export async function getCheckoutSessionPromotionCode(
  stripe: Stripe,
  sessionId: string,
): Promise<Stripe.PromotionCode | null> {
  const expanded = await stripe.checkout.sessions.retrieve(sessionId, {
    expand: ["discounts.promotion_code"],
  });
  for (const discount of expanded.discounts ?? []) {
    const promo = discount.promotion_code;
    if (promo && typeof promo === "object" && "code" in promo) {
      return promo as Stripe.PromotionCode;
    }
    if (typeof promo === "string") {
      try {
        return await stripe.promotionCodes.retrieve(promo);
      } catch {
        return null;
      }
    }
  }
  return null;
}

/**
 * Resolve the Promotion Code object on a paid invoice. Subscription
 * renewals reach us via invoice.paid; the discount lives on the invoice
 * (or on the subscription that produced it). Returns null when no promo
 * code applied. Same retrieval pattern as the checkout-session helper.
 */
export async function getInvoicePromotionCode(
  stripe: Stripe,
  invoice: Stripe.Invoice,
): Promise<Stripe.PromotionCode | null> {
  const expanded = invoice.id
    ? await stripe.invoices.retrieve(invoice.id, {
        expand: ["discounts.promotion_code"],
      })
    : invoice;
  // Newer Stripe API: invoice.discounts is an array of Discount (or
  // string ids when not expanded). Older: invoice.discount (single).
  // The union also includes DeletedDiscount, which lacks
  // `promotion_code` — narrow defensively rather than against the
  // public type.
  type DiscountLike = {
    promotion_code?: string | Stripe.PromotionCode | null;
  };
  const candidates: Array<string | DiscountLike> = [];
  if (Array.isArray(expanded.discounts)) {
    for (const item of expanded.discounts) {
      candidates.push(item as string | DiscountLike);
    }
  }
  const legacyDiscount = (expanded as unknown as { discount?: DiscountLike | null }).discount;
  if (legacyDiscount) candidates.push(legacyDiscount);

  for (const candidate of candidates) {
    if (typeof candidate === "string") continue;
    const promo = candidate.promotion_code;
    if (promo && typeof promo === "object" && "code" in promo) {
      return promo as Stripe.PromotionCode;
    }
    if (typeof promo === "string") {
      try {
        return await stripe.promotionCodes.retrieve(promo);
      } catch {
        return null;
      }
    }
  }
  return null;
}

/**
 * Find an ambassador by the human-readable Promotion Code text. Codes
 * are stored normalized in the DB so a straight equality lookup on the
 * uppercased input is enough. Returns null when no active ambassador
 * matches — inactive ambassadors are intentionally excluded so toggling
 * `active = false` instantly stops new commissions accruing.
 */
export async function findActiveAmbassadorByPromotionCode(
  admin: AdminClient,
  code: string,
): Promise<AmbassadorRow | null> {
  const normalized = code.trim().toUpperCase();
  if (!normalized) return null;
  const { data, error } = await admin
    .from("ambassadors")
    .select("id, name, email, promotion_code, commission_rate, active")
    .eq("promotion_code", normalized)
    .eq("active", true)
    .maybeSingle<AmbassadorRow>();
  if (error) {
    console.error("Memora ambassadors: lookup failed", { code: normalized, error });
    throw error;
  }
  return data;
}

type RecordCommissionInput = {
  ambassador: AmbassadorRow;
  stripeEventId: string;
  source: "one_time" | "subscription_initial" | "subscription_renewal";
  paymentAmountCents: number;
  currency: string;
  buyerUserId?: string | null;
  planId?: string | null;
  stripeSessionId?: string | null;
  stripeInvoiceId?: string | null;
  stripePaymentIntentId?: string | null;
  stripeChargeId?: string | null;
  notes?: string | null;
};

/**
 * Insert a `pending` commission row. Returns "inserted" on success,
 * "duplicate" when the partial unique indexes catch a re-record of the
 * same payment, and throws on anything else.
 */
export async function recordPendingCommission(
  admin: AdminClient,
  input: RecordCommissionInput,
): Promise<"inserted" | "duplicate"> {
  if (input.paymentAmountCents <= 0) return "duplicate";
  const commission = Math.floor(
    input.paymentAmountCents * input.ambassador.commission_rate,
  );
  if (commission <= 0) return "duplicate";

  const { error } = await admin.from("ambassador_commissions").insert({
    ambassador_id: input.ambassador.id,
    buyer_user_id: input.buyerUserId ?? null,
    stripe_event_id: input.stripeEventId,
    stripe_session_id: input.stripeSessionId ?? null,
    stripe_invoice_id: input.stripeInvoiceId ?? null,
    stripe_payment_intent_id: input.stripePaymentIntentId ?? null,
    stripe_charge_id: input.stripeChargeId ?? null,
    source: input.source,
    plan_id: input.planId ?? null,
    payment_amount_cents: input.paymentAmountCents,
    commission_amount_cents: commission,
    currency: input.currency.toLowerCase(),
    status: "pending",
    notes: input.notes ?? null,
  });
  if (!error) return "inserted";
  if ((error as { code?: string }).code === PG_UNIQUE_VIOLATION) {
    console.info("Memora ambassadors: duplicate commission ignored", {
      ambassadorId: input.ambassador.id,
      paymentIntent: input.stripePaymentIntentId,
      invoice: input.stripeInvoiceId,
      session: input.stripeSessionId,
    });
    return "duplicate";
  }
  console.error("Memora ambassadors: commission insert failed", {
    ambassadorId: input.ambassador.id,
    error,
  });
  throw error;
}

/**
 * Look up the buyer's profile id from a Stripe customer id so the
 * commission row can be joined back to the user. Returns null when no
 * profile maps to this customer (e.g. customer created outside our
 * flow) — callers should still record the commission with a null buyer.
 */
export async function lookupProfileIdByCustomer(
  admin: AdminClient,
  customerId: string,
): Promise<string | null> {
  const { data, error } = await admin
    .from("profiles")
    .select("id")
    .eq("stripe_customer_id", customerId)
    .maybeSingle<{ id: string }>();
  if (error) {
    console.error("Memora ambassadors: customer→profile lookup failed", {
      customerId,
      error,
    });
    return null;
  }
  return data?.id ?? null;
}

/**
 * On charge.refunded, flip any commission rows tied to that payment to
 * `refunded`. We match on payment_intent_id rather than charge_id so
 * one-time and subscription payments are both covered (charge_id may
 * not have been recorded if the row was created from session/invoice
 * metadata before the charge existed). Touching only `pending` and
 * `paid` rows keeps already-voided rows stable.
 */
export async function markCommissionsRefundedForCharge(
  admin: AdminClient,
  charge: Stripe.Charge,
): Promise<number> {
  const paymentIntentId =
    typeof charge.payment_intent === "string"
      ? charge.payment_intent
      : charge.payment_intent?.id ?? null;
  if (!paymentIntentId) return 0;

  // We don't distinguish full vs partial refund here — Stripe fires
  // charge.refunded for both. If the customer was only partially
  // refunded the admin can review the row and adjust manually; the
  // notes field surfaces the partial-refund context.
  const isPartial =
    typeof charge.amount_refunded === "number" &&
    typeof charge.amount === "number" &&
    charge.amount_refunded < charge.amount;

  const { data, error } = await admin
    .from("ambassador_commissions")
    .update({
      status: "refunded",
      refunded_at: new Date().toISOString(),
      notes: isPartial
        ? "Partially refunded by Stripe — review before paying out."
        : "Refunded by Stripe.",
    })
    .eq("stripe_payment_intent_id", paymentIntentId)
    .in("status", ["pending", "paid"])
    .select("id");
  if (error) {
    console.error("Memora ambassadors: refund mark failed", {
      paymentIntentId,
      error,
    });
    throw error;
  }
  return data?.length ?? 0;
}
