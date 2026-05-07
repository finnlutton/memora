-- Ambassador tracking + commission ledger.
--
-- Lightweight referral system for early Memora ambassadors. We map a
-- Stripe Promotion Code (the human-readable code customers type at
-- checkout, e.g. "ELI10") to an ambassador record, then record a 10%
-- commission row each time a successful payment uses that code.
--
-- Payouts are NOT automated — an admin marks rows as paid by hand from
-- the admin panel. Refunds before payout flip the row to `refunded`.
--
-- Dedup strategy: every commission row is keyed by the Stripe IDs it
-- was created from. Partial unique indexes on payment_intent_id /
-- invoice_id / session_id prevent the same payment from being recorded
-- twice across event types (e.g. checkout.session.completed for a
-- one-time payment also fires elsewhere; subscription first-invoice
-- arrives via invoice.paid). The webhook itself is idempotent at the
-- Stripe-event level via the existing stripe_processed_events table —
-- this is a second layer of protection at the *payment* level.
--
-- RLS: both tables are admin-only. The webhook runs through the
-- service-role client and bypasses RLS; admin pages read/write through
-- /api/admin/* routes that gate on isAdminEmail() before touching the
-- service-role client.

create table if not exists public.ambassadors (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  email text,
  -- Human-readable Stripe Promotion Code (e.g. "ELI10"). Stored
  -- normalized (uppercase) so case-insensitive lookups can use a
  -- straight equality comparison against the upper(code) input from
  -- the webhook.
  promotion_code text not null,
  commission_rate numeric(5, 4) not null default 0.10
    check (commission_rate >= 0 and commission_rate <= 1),
  active boolean not null default true,
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create unique index if not exists ambassadors_promotion_code_unique
  on public.ambassadors (promotion_code);

create index if not exists ambassadors_email_idx
  on public.ambassadors (lower(email));

create or replace function public.set_ambassadors_updated_at()
returns trigger
language plpgsql
as $$
begin
  NEW.updated_at := now();
  return NEW;
end;
$$;

drop trigger if exists set_ambassadors_updated_at on public.ambassadors;
create trigger set_ambassadors_updated_at
  before update on public.ambassadors
  for each row execute function public.set_ambassadors_updated_at();

alter table public.ambassadors enable row level security;

-- No client-facing policies. Service role bypasses RLS; admin routes
-- gate access in application code via isAdminEmail() before touching
-- the table.

create table if not exists public.ambassador_commissions (
  id uuid primary key default gen_random_uuid(),
  ambassador_id uuid not null references public.ambassadors (id),
  -- Buyer profile when we can resolve it. Nullable because the webhook
  -- may run before/without a profile mapping (e.g. customer created
  -- outside our flow), and we'd rather record the commission with a
  -- null buyer than drop it on the floor.
  buyer_user_id uuid references public.profiles (id) on delete set null,
  -- Stripe identifiers. We always record the event id that produced
  -- this row plus whichever payment-level ids were available, so refund
  -- handling and admin reconciliation can find rows from any of them.
  stripe_event_id text not null,
  stripe_session_id text,
  stripe_invoice_id text,
  stripe_payment_intent_id text,
  stripe_charge_id text,
  -- Source classification:
  --   one_time              — checkout.session.completed, mode=payment
  --   subscription_initial  — invoice.paid for the first invoice on a sub
  --   subscription_renewal  — invoice.paid for any subsequent invoice
  source text not null
    check (source in ('one_time', 'subscription_initial', 'subscription_renewal')),
  -- Memora plan that was purchased, when known. Free-form text rather
  -- than an FK so we don't trip if the plan id is later renamed or
  -- archived.
  plan_id text,
  -- Cents / minor units in `currency`. Use ints to avoid float drift on
  -- proration math.
  payment_amount_cents bigint not null check (payment_amount_cents >= 0),
  commission_amount_cents bigint not null check (commission_amount_cents >= 0),
  currency text not null default 'usd',
  status text not null default 'pending'
    check (status in ('pending', 'paid', 'void', 'refunded')),
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  paid_at timestamptz,
  paid_by_admin_email text,
  voided_at timestamptz,
  refunded_at timestamptz
);

-- Dedup at the payment level. Each Stripe object id can only produce
-- one commission row. Partial-unique so multiple null rows are allowed
-- for the rare case where one of the ids isn't available.
create unique index if not exists ambassador_commissions_session_unique
  on public.ambassador_commissions (stripe_session_id)
  where stripe_session_id is not null;

create unique index if not exists ambassador_commissions_invoice_unique
  on public.ambassador_commissions (stripe_invoice_id)
  where stripe_invoice_id is not null;

create unique index if not exists ambassador_commissions_payment_intent_unique
  on public.ambassador_commissions (stripe_payment_intent_id)
  where stripe_payment_intent_id is not null;

create index if not exists ambassador_commissions_ambassador_idx
  on public.ambassador_commissions (ambassador_id, status);

create index if not exists ambassador_commissions_status_created_idx
  on public.ambassador_commissions (status, created_at desc);

create index if not exists ambassador_commissions_charge_idx
  on public.ambassador_commissions (stripe_charge_id)
  where stripe_charge_id is not null;

create or replace function public.set_ambassador_commissions_updated_at()
returns trigger
language plpgsql
as $$
begin
  NEW.updated_at := now();
  return NEW;
end;
$$;

drop trigger if exists set_ambassador_commissions_updated_at on public.ambassador_commissions;
create trigger set_ambassador_commissions_updated_at
  before update on public.ambassador_commissions
  for each row execute function public.set_ambassador_commissions_updated_at();

alter table public.ambassador_commissions enable row level security;

-- No client-facing policies. Same admin-gated access pattern as the
-- ambassadors table above.
