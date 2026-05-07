-- Max plan repricing: the `lifetime` plan id (formerly the unlimited
-- "Founder" tier) is now the user-facing "Max" plan — $39.99 one-time,
-- 3 years of access, capped at 5x Plus across the board to mirror the
-- Abroad Pass shape. This migration re-issues the BEFORE-INSERT trigger
-- functions so `selected_plan = 'lifetime'` enforces real caps instead
-- of falling through to the unlimited branch.
--
-- Plan id stays `lifetime` because it's already stored that way in
-- profiles.selected_plan, in the Stripe webhook mapping, and in the
-- STRIPE_PRICE_LIFETIME env var. Renaming the id would force a DB +
-- Stripe re-key for no user-visible benefit.
--
-- Behavior summary (mirrors lib/plans.ts):
--   lifetime ("Max")  galleries 100  subgall. 50  photos/sub 200  direct 200
--                     shares 60/month  during the 3-year window
--
-- Existing Founder/Lifetime users at counts above the new caps keep
-- everything they already have (BEFORE INSERT only); they simply cannot
-- create *new* items above the cap. The legacy `max` recurring plan is
-- still treated as unlimited via the `else null` branch.
--
-- Updated cap table:
--   plan       galleries  subgall.  photos/sub  direct  shares  period
--   free       2          3         15          15      3       lifetime
--   plus       20         10        40          40      12      monthly
--   abroad_pass 100       50        200         200     60      monthly
--   lifetime   100        50        200         200     60      monthly  ← NEW
--   max        unlim      unlim     unlim       unlim   unlim   —        (legacy)
--   internal   unlim      unlim     unlim       unlim   unlim   —

/* ── 1. Galleries ─────────────────────────────────────────────────────── */

create or replace function public.check_gallery_limit()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  plan_id text;
  is_internal boolean;
  cap int;
  current_count int;
begin
  select public.plan_normalize(selected_plan), coalesce(is_internal_account, false)
    into plan_id, is_internal
  from public.profiles
  where id = NEW.user_id
  for update;

  if is_internal then return NEW; end if;

  cap := case plan_id
    when 'free' then 2
    when 'plus' then 20
    when 'abroad_pass' then 100
    when 'lifetime' then 100
    else null  -- max (legacy), internal
  end;
  if cap is null then return NEW; end if;

  select count(*) into current_count
  from public.galleries
  where user_id = NEW.user_id;

  if current_count >= cap then
    raise exception 'PLAN_LIMIT_REACHED:galleries' using errcode = 'P0001';
  end if;

  return NEW;
end;
$$;

/* ── 2. Subgalleries ──────────────────────────────────────────────────── */

create or replace function public.check_subgallery_limit()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  plan_id text;
  is_internal boolean;
  cap int;
  current_count int;
begin
  perform 1 from public.galleries where id = NEW.gallery_id for update;

  select public.plan_normalize(selected_plan), coalesce(is_internal_account, false)
    into plan_id, is_internal
  from public.profiles
  where id = NEW.user_id;

  if is_internal then return NEW; end if;

  cap := case plan_id
    when 'free' then 3
    when 'plus' then 10
    when 'abroad_pass' then 50
    when 'lifetime' then 50
    else null
  end;
  if cap is null then return NEW; end if;

  select count(*) into current_count
  from public.subgalleries
  where gallery_id = NEW.gallery_id;

  if current_count >= cap then
    raise exception 'PLAN_LIMIT_REACHED:subgalleries' using errcode = 'P0001';
  end if;

  return NEW;
end;
$$;

/* ── 3. Photos (subgallery photos AND direct gallery photos) ───────────── */

create or replace function public.check_photo_limit()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  plan_id text;
  is_internal boolean;
  cap int;
  current_count int;
  resource_label text;
begin
  if NEW.subgallery_id is null then
    perform 1 from public.galleries where id = NEW.gallery_id for update;
  else
    perform 1 from public.subgalleries where id = NEW.subgallery_id for update;
  end if;

  select public.plan_normalize(selected_plan), coalesce(is_internal_account, false)
    into plan_id, is_internal
  from public.profiles
  where id = NEW.user_id;

  if is_internal then return NEW; end if;

  if NEW.subgallery_id is null then
    resource_label := 'directPhotos';
    cap := case plan_id
      when 'free' then 15
      when 'plus' then 40
      when 'abroad_pass' then 200
      when 'lifetime' then 200
      else null
    end;
  else
    resource_label := 'photos';
    cap := case plan_id
      when 'free' then 15
      when 'plus' then 40
      when 'abroad_pass' then 200
      when 'lifetime' then 200
      else null
    end;
  end if;
  if cap is null then return NEW; end if;

  if NEW.subgallery_id is null then
    select count(*) into current_count
    from public.photos
    where gallery_id = NEW.gallery_id and subgallery_id is null;
  else
    select count(*) into current_count
    from public.photos
    where subgallery_id = NEW.subgallery_id;
  end if;

  if current_count >= cap then
    raise exception 'PLAN_LIMIT_REACHED:%', resource_label using errcode = 'P0001';
  end if;

  return NEW;
end;
$$;

/* ── 4. Shares ────────────────────────────────────────────────────────── */

create or replace function public.check_share_limit()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  plan_id text;
  is_internal boolean;
  cap int;
  period text;
  current_count int;
  month_start timestamptz;
begin
  select public.plan_normalize(selected_plan), coalesce(is_internal_account, false)
    into plan_id, is_internal
  from public.profiles
  where id = NEW.owner_user_id
  for update;

  if is_internal then return NEW; end if;

  cap := case plan_id
    when 'free' then 3
    when 'plus' then 12
    when 'abroad_pass' then 60
    when 'lifetime' then 60
    else null
  end;
  if cap is null then return NEW; end if;

  -- Plus, Abroad Pass, and Max (lifetime) all use a monthly window. Free
  -- is lifetime.
  period := case plan_id
    when 'plus' then 'monthly'
    when 'abroad_pass' then 'monthly'
    when 'lifetime' then 'monthly'
    else 'lifetime'
  end;

  if period = 'monthly' then
    month_start := date_trunc('month', (now() at time zone 'utc')) at time zone 'utc';
    select count(*) into current_count
    from public.shares
    where owner_user_id = NEW.owner_user_id
      and created_at >= month_start;
  else
    select count(*) into current_count
    from public.shares
    where owner_user_id = NEW.owner_user_id;
  end if;

  if current_count >= cap then
    raise exception 'PLAN_LIMIT_REACHED:shares' using errcode = 'P0001';
  end if;

  return NEW;
end;
$$;
