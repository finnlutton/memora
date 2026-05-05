-- Abroad Pass plan support: extend plan_normalize() and plan-limit
-- triggers so the new `abroad_pass` plan id is recognized everywhere
-- the existing plans are.
--
-- Behavior summary (mirrors lib/plans.ts):
--   abroad_pass  galleries 100  subgall. 50  photos/sub 200  direct 200
--                shares 60/month  (5x Plus during the 6-month window)
--
-- After purchase the webhook stamps `subscription_current_period_end`
-- with `purchased_at + 6 months`. The trigger functions enforce the
-- elevated caps for as long as `selected_plan = 'abroad_pass'`. Once
-- the user expires, `resolveEffectivePlanId` (server-side) and the
-- billing UI funnel them through the upgrade/downgrade flows; if they
-- end up back on Free their selected_plan is rewritten by the webhook
-- to 'free' so the triggers stop honoring the elevated caps. The
-- triggers below default abroad_pass to its caps unconditionally —
-- no expiry logic in plpgsql, since the application layer is the
-- source of truth for the access window and we never want to break a
-- user mid-upload because of a race between Postgres now() and the
-- stamped expiry.
--
-- Backwards-compatible alias handling: we tolerate "abroad-pass" and
-- "abroad pass" as inputs to plan_normalize() so any spelling that
-- leaks through gets canonicalized to "abroad_pass".

create or replace function public.plan_normalize(plan_text text)
returns text
language sql
immutable
parallel safe
set search_path = public
as $$
  select case
    when plan_text is null then 'free'
    when lower(trim(plan_text)) = 'pro' then 'max'
    when lower(trim(plan_text)) = 'lite' then 'free'
    when lower(trim(plan_text)) in ('abroad-pass','abroad pass','abroadpass')
      then 'abroad_pass'
    when lower(trim(plan_text)) in (
      'free','plus','abroad_pass','max','lifetime','internal'
    )
      then lower(trim(plan_text))
    else 'free'
  end;
$$;

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
    else null  -- max, lifetime, internal
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
      else null
    end;
  else
    resource_label := 'photos';
    cap := case plan_id
      when 'free' then 15
      when 'plus' then 40
      when 'abroad_pass' then 200
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
    else null
  end;
  if cap is null then return NEW; end if;

  -- Both Plus and Abroad Pass are monthly windows. Free is lifetime.
  period := case plan_id
    when 'plus' then 'monthly'
    when 'abroad_pass' then 'monthly'
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
