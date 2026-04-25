-- Direct gallery photos + date dividers
--
-- Lets a gallery hold photos directly (no subgallery wrapper) and lets users
-- organize them under free-form date headers (e.g. "Friday", "Apr 18").
--
-- Photos:
--   The photos.subgallery_id column is already nullable — we don't change
--   the existing schema other than adding per-photo location fields and
--   an index for the new "direct gallery photo" lookup pattern.
--
-- Dividers:
--   New table public.gallery_dividers. Same RLS shape as the other tables
--   in this project (user_id = auth.uid()), and ordered alongside photos
--   via display_order in a single shared numeric space per gallery.

-- 1. Per-photo location fields (each direct photo can pin its own spot)
alter table public.photos
  add column if not exists location text,
  add column if not exists location_lat double precision,
  add column if not exists location_lng double precision;

-- 2. Faster lookup for "all direct photos of a gallery" (subgallery_id is null)
create index if not exists photos_gallery_direct_idx
  on public.photos(gallery_id)
  where subgallery_id is null;

-- 3. Date dividers
create table if not exists public.gallery_dividers (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  gallery_id uuid not null references public.galleries(id) on delete cascade,
  label text not null default '',
  display_order integer not null default 0,
  created_at timestamptz not null default now()
);

create index if not exists gallery_dividers_gallery_id_idx
  on public.gallery_dividers(gallery_id);
create index if not exists gallery_dividers_user_id_idx
  on public.gallery_dividers(user_id);

alter table public.gallery_dividers enable row level security;

drop policy if exists "gallery_dividers_select_own" on public.gallery_dividers;
create policy "gallery_dividers_select_own"
on public.gallery_dividers
for select
to authenticated
using (user_id = auth.uid());

drop policy if exists "gallery_dividers_insert_own" on public.gallery_dividers;
create policy "gallery_dividers_insert_own"
on public.gallery_dividers
for insert
to authenticated
with check (user_id = auth.uid());

drop policy if exists "gallery_dividers_update_own" on public.gallery_dividers;
create policy "gallery_dividers_update_own"
on public.gallery_dividers
for update
to authenticated
using (user_id = auth.uid())
with check (user_id = auth.uid());

drop policy if exists "gallery_dividers_delete_own" on public.gallery_dividers;
create policy "gallery_dividers_delete_own"
on public.gallery_dividers
for delete
to authenticated
using (user_id = auth.uid());
