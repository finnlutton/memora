import "server-only";
import Stripe from "stripe";

/**
 * Lazy server-side Stripe client.
 *
 * - Reads STRIPE_SECRET_KEY only at first call so the module can be
 *   imported during build/typegen without crashing when the env is
 *   missing (e.g. webhook secret unset during a preview build).
 * - Pinned API version ensures upgrades are intentional.
 */

let cachedClient: Stripe | null = null;

export function getStripeClient(): Stripe {
  if (cachedClient) return cachedClient;
  const secret = process.env.STRIPE_SECRET_KEY;
  if (!secret) {
    throw new Error("STRIPE_SECRET_KEY is not configured.");
  }
  // Pin to a known GA API version. Cast through `as never` to stay
  // compatible across minor SDK type-version changes without locking to
  // a single literal.
  cachedClient = new Stripe(secret, {
    apiVersion: "2024-12-18.acacia" as never,
    appInfo: { name: "Memora", url: "https://memoragallery.com" },
    typescript: true,
  });
  return cachedClient;
}
