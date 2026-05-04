# Stripe setup

This doc covers everything you need to run Stripe (test mode and live)
against Memora.

## Required environment variables

Set these in `.env.local` for local dev and in **Vercel → Project →
Settings → Environment Variables** for preview/production.

| Var | Where | Notes |
|---|---|---|
| `STRIPE_SECRET_KEY` | server only | `sk_test_…` (test) or `sk_live_…` (live) |
| `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY` | client | reserved for future client-side use; not currently read by any route |
| `STRIPE_PRICE_PLUS_MONTHLY` | server | recurring price for the Plus plan |
| `STRIPE_PRICE_MAX_MONTHLY` | server | recurring price for the Max plan |
| `STRIPE_PRICE_LIFETIME` | server | one-time price for the Founder Plan ($59.99 / 3 yrs). Env var keeps the legacy `LIFETIME` name; the Stripe price object behind it is now the Founder price. |
| `STRIPE_WEBHOOK_SECRET` | server | `whsec_…` from Stripe Dashboard or CLI |
| `NEXT_PUBLIC_SITE_URL` | client | canonical site origin (e.g. `https://memoragallery.com`) |
| `SUPABASE_SERVICE_ROLE_KEY` | server | already required for admin Supabase writes |

The price IDs are intentionally **not** prefixed `NEXT_PUBLIC_*` — the
client only ever sends a `planId` (`plus` / `max` / `lifetime`) and the
server resolves the price ID from env vars. The `lifetime` plan id is
the internal key for what's branded publicly as the Founder Plan.

The free and internal full-access plans never touch Stripe.

## Database migration

Apply `supabase/migrations/20260425001000_stripe_billing.sql` once. It
adds the Stripe billing columns to `public.profiles` and reconciles two
retired plan IDs (`lite` → `free`, `pro` → `max`).

Run it via Supabase Dashboard → SQL Editor, or `supabase db push`.

## Local testing with Stripe CLI

1. Install the CLI: <https://stripe.com/docs/stripe-cli>
2. `stripe login`
3. Forward events to your dev server:
   ```
   stripe listen --forward-to localhost:3000/api/stripe/webhook
   ```
   The CLI prints a `whsec_…` value — copy it into
   `STRIPE_WEBHOOK_SECRET` in `.env.local` and **restart the dev server**.
4. Trigger a Plus checkout from the pricing page in your app, or use the
   CLI to fire test events:
   ```
   stripe trigger checkout.session.completed
   stripe trigger customer.subscription.updated
   ```

You should see `Memora webhook: …` log lines in the dev server output.

## Production webhook endpoint

In **Stripe Dashboard → Developers → Webhooks → Add endpoint**:

- URL: `https://<your-vercel-domain>/api/stripe/webhook`
- Events to send:
  - `checkout.session.completed`
  - `customer.subscription.created`
  - `customer.subscription.updated`
  - `customer.subscription.deleted`
  - `invoice.payment_succeeded`
  - `invoice.payment_failed`
- Copy the **Signing secret** (`whsec_…`) into `STRIPE_WEBHOOK_SECRET` in
  Vercel and redeploy.

## Testing checkout

In test mode, use Stripe's [test card](https://stripe.com/docs/testing)
`4242 4242 4242 4242` with any future expiry and any CVC.

1. Sign in.
2. Go to **Settings → Choose membership**.
3. Click a paid plan (Plus, Max, or Founder).
4. Complete checkout in the hosted Stripe page.
5. You'll land on `/galleries?checkout=success`.
6. The webhook updates the profile's `selected_plan`,
   `subscription_status`, `subscription_current_period_end`, etc.

Verify in Supabase: `select selected_plan, subscription_status, stripe_customer_id from profiles where id = '<user>';`

## Testing the customer portal

For a user with an active subscription:

1. Go to **Settings → Manage billing**.
2. The portal opens. Cancel, swap plans, update payment method.
3. The webhook reflects the change in your profile.

## Switching from test to live

1. Create live-mode products + prices in Stripe.
2. Update env vars in **Vercel → Production**:
   - `STRIPE_SECRET_KEY` → `sk_live_…`
   - `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY` → `pk_live_…`
   - `STRIPE_PRICE_PLUS_MONTHLY`, `STRIPE_PRICE_MAX_MONTHLY`,
     `STRIPE_PRICE_LIFETIME` → live price IDs
3. Add the production webhook endpoint (live mode) and copy the live
   `whsec_…` into `STRIPE_WEBHOOK_SECRET`.
4. Redeploy.

Test mode env vars stay on **Preview** so previews don't charge real cards.

## Internal full-access accounts

The `internal` plan is full-access, never billed, never shown publicly.
(Distinct from the public Founder Plan, which is a paid one-time
purchase backed by Stripe.)
After running the migration, mark accounts as internal with:

```sql
update public.profiles
set is_internal_account = true,
    selected_plan = 'internal'
where email in ('finn.lutton@gmail.com', 'cfl63@cornell.edu');
```

Webhooks **will not downgrade** internal accounts — even if Stripe sends
a cancellation event for that customer, `selected_plan` stays
`internal`.

## Build safety

If `STRIPE_WEBHOOK_SECRET` is unset (e.g. early Vercel deploy before the
endpoint exists), the webhook route returns a clean 500 instead of
crashing the build. The other routes only require their env vars at
request time — Stripe is never instantiated at module load.
