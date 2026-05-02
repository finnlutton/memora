-- Idempotency log for Stripe webhook events.
--
-- Stripe retries delivery on any non-2xx and on rare network timeouts, so the
-- same event_id can arrive more than once. Replays of e.g. a
-- customer.subscription.deleted event can re-flip subscription state in odd
-- ways (especially around plan changes overlapping with a cancel), and
-- billing-side double-processing is hard to detect after the fact.
--
-- The webhook handler claims an event by inserting its id here BEFORE doing
-- any work; the unique-violation on the primary key tells us we've already
-- processed this delivery and lets us return 200 immediately. If processing
-- fails, the row is deleted so Stripe's next retry can claim it cleanly.
--
-- No RLS policies — only the service role (which bypasses RLS) reads/writes
-- this table from the webhook handler. End users never touch it.

create table if not exists public.stripe_processed_events (
  event_id text primary key,
  event_type text not null,
  processed_at timestamptz not null default now()
);

alter table public.stripe_processed_events enable row level security;
