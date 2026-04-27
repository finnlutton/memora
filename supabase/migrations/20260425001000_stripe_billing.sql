-- Stripe billing state on profiles + plan-id reconciliation
--
-- Adds the columns the webhook + portal flows need, then migrates any
-- existing selected_plan values that are no longer valid:
--   'lite' → 'free'   (Lite plan retired)
--   'pro'  → 'max'    (Pro renamed to Max)
--
-- All columns nullable / defaulted so existing rows are unaffected.

alter table public.profiles
  add column if not exists stripe_customer_id text,
  add column if not exists stripe_subscription_id text,
  add column if not exists stripe_price_id text,
  add column if not exists subscription_status text,
  add column if not exists subscription_current_period_end timestamptz,
  add column if not exists subscription_cancel_at_period_end boolean not null default false,
  add column if not exists is_internal_account boolean not null default false;

-- One Stripe customer per profile. Partial unique index ignores nulls so
-- free users (no Stripe customer yet) don't collide.
create unique index if not exists profiles_stripe_customer_id_unique
  on public.profiles(stripe_customer_id)
  where stripe_customer_id is not null;

-- Reconcile retired plan IDs. is_internal_account stays untouched.
update public.profiles
  set selected_plan = 'free'
  where selected_plan = 'lite';

update public.profiles
  set selected_plan = 'max'
  where selected_plan = 'pro';
