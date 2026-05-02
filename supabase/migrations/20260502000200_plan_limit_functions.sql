-- Plan-limit enforcement: BEFORE INSERT trigger functions + attach.
--
-- Backstop for /api/plan-limits/check, which is the primary UX layer but
-- can be bypassed by a crafted client and has a TOCTOU race (two tabs at
-- limit-1 both pass the check, both insert). Each trigger function locks
-- the relevant parent row, recounts inside the same transaction, and
-- raises P0001 with a 'PLAN_LIMIT_REACHED:<resource>' message that
-- callers can translate to a 409 response.
--
-- Functions and triggers are co-located in a single migration so the file
-- is order-safe when applied via the Supabase SQL Editor (no foot-gun
-- where attaching triggers is run before the functions exist).
--
-- Caps are mirrored from lib/plans.ts and MUST be kept in sync. NULL =
-- unlimited. Internal/founder accounts (`profiles.is_internal_account`)
-- always pass.
--
-- Plan caps:
--   plan       galleries  subgall.  photos/sub  direct  shares  period
--   free       2          3         15          15      3       lifetime
--   plus       20         10        40          40      12      monthly
--   max        unlim      unlim     unlim       unlim   unlim   —
--   lifetime   unlim      unlim     unlim       unlim   unlim   —
--   internal   unlim      unlim     unlim       unlim   unlim   —
--
-- Retired-plan remap matches lib/plans.ts:
--   pro  → max   (renamed)
--   lite → free  (Lite tier retired)
--   anything unrecognized → free

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
    when lower(trim(plan_text)) in ('free','plus','max','lifetime','internal')
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
  -- Serialize concurrent gallery inserts for this user. The lock is held
  -- until the transaction commits, so two tabs racing at limit-1 cannot
  -- both pass the count below.
  select public.plan_normalize(selected_plan), coalesce(is_internal_account, false)
    into plan_id, is_internal
  from public.profiles
  where id = NEW.user_id
  for update;

  if is_internal then return NEW; end if;

  cap := case plan_id
    when 'free' then 2
    when 'plus' then 20
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
  -- Lock the parent gallery row so two concurrent subgallery inserts
  -- against the same gallery serialize through this trigger.
  perform 1 from public.galleries where id = NEW.gallery_id for update;

  select public.plan_normalize(selected_plan), coalesce(is_internal_account, false)
    into plan_id, is_internal
  from public.profiles
  where id = NEW.user_id;

  if is_internal then return NEW; end if;

  cap := case plan_id
    when 'free' then 3
    when 'plus' then 10
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
  -- Two distinct caps depending on whether this is a subgallery photo or
  -- a direct gallery photo (subgallery_id IS NULL). Lock the appropriate
  -- parent row to serialize racing inserts.
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
      else null
    end;
  else
    resource_label := 'photos';
    cap := case plan_id
      when 'free' then 15
      when 'plus' then 40
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
  -- Serialize per-owner share inserts. Free counts every share ever
  -- created (revoked or not); Plus counts shares created since the start
  -- of the current calendar month (UTC).
  select public.plan_normalize(selected_plan), coalesce(is_internal_account, false)
    into plan_id, is_internal
  from public.profiles
  where id = NEW.owner_user_id
  for update;

  if is_internal then return NEW; end if;

  cap := case plan_id
    when 'free' then 3
    when 'plus' then 12
    else null
  end;
  if cap is null then return NEW; end if;

  period := case plan_id when 'plus' then 'monthly' else 'lifetime' end;

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

/* ── Attach BEFORE INSERT triggers ─────────────────────────────────────
 * Rollback (run manually if a trigger misbehaves in production):
 *   drop trigger if exists enforce_gallery_limit    on public.galleries;
 *   drop trigger if exists enforce_subgallery_limit on public.subgalleries;
 *   drop trigger if exists enforce_photo_limit      on public.photos;
 *   drop trigger if exists enforce_share_limit      on public.shares;
 */

drop trigger if exists enforce_gallery_limit on public.galleries;
create trigger enforce_gallery_limit
  before insert on public.galleries
  for each row execute function public.check_gallery_limit();

drop trigger if exists enforce_subgallery_limit on public.subgalleries;
create trigger enforce_subgallery_limit
  before insert on public.subgalleries
  for each row execute function public.check_subgallery_limit();

drop trigger if exists enforce_photo_limit on public.photos;
create trigger enforce_photo_limit
  before insert on public.photos
  for each row execute function public.check_photo_limit();

drop trigger if exists enforce_share_limit on public.shares;
create trigger enforce_share_limit
  before insert on public.shares
  for each row execute function public.check_share_limit();
