-- Memora core persistence schema + RLS + storage policies
-- Run with Supabase migrations (`supabase db push`) or SQL editor.

create extension if not exists pgcrypto;

create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  email text,
  username text,
  role text not null default 'user',
  selected_plan text,
  created_at timestamptz not null default now()
);

insert into public.profiles (id, email)
select id, email
from auth.users
on conflict (id) do nothing;

create table if not exists public.galleries (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  title text not null,
  description text,
  cover_image_path text,
  location text,
  start_date date,
  end_date date,
  locations text[] not null default '{}',
  people text[] not null default '{}',
  mood_tags text[] not null default '{}',
  privacy text not null default 'private',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.subgalleries (
  id uuid primary key default gen_random_uuid(),
  gallery_id uuid not null references public.galleries(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  title text not null,
  description text,
  cover_image_path text,
  location text,
  start_date date,
  end_date date,
  date_label text,
  display_order integer default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.photos (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  gallery_id uuid references public.galleries(id) on delete cascade,
  subgallery_id uuid references public.subgalleries(id) on delete cascade,
  storage_path text not null,
  caption text,
  display_order integer default 0,
  taken_at timestamptz,
  created_at timestamptz not null default now()
);

create index if not exists galleries_user_id_idx on public.galleries(user_id);
create index if not exists subgalleries_gallery_id_idx on public.subgalleries(gallery_id);
create index if not exists subgalleries_user_id_idx on public.subgalleries(user_id);
create index if not exists photos_subgallery_id_idx on public.photos(subgallery_id);
create index if not exists photos_user_id_idx on public.photos(user_id);

create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists set_galleries_updated_at on public.galleries;
create trigger set_galleries_updated_at
before update on public.galleries
for each row execute function public.set_updated_at();

drop trigger if exists set_subgalleries_updated_at on public.subgalleries;
create trigger set_subgalleries_updated_at
before update on public.subgalleries
for each row execute function public.set_updated_at();

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, email)
  values (new.id, new.email)
  on conflict (id) do update set email = excluded.email;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
after insert on auth.users
for each row execute function public.handle_new_user();

alter table public.profiles enable row level security;
alter table public.galleries enable row level security;
alter table public.subgalleries enable row level security;
alter table public.photos enable row level security;

drop policy if exists "profiles_select_own" on public.profiles;
create policy "profiles_select_own"
on public.profiles
for select
to authenticated
using (id = auth.uid());

drop policy if exists "profiles_update_own" on public.profiles;
create policy "profiles_update_own"
on public.profiles
for update
to authenticated
using (id = auth.uid())
with check (id = auth.uid());

drop policy if exists "galleries_select_own" on public.galleries;
create policy "galleries_select_own"
on public.galleries
for select
to authenticated
using (user_id = auth.uid());

drop policy if exists "galleries_insert_own" on public.galleries;
create policy "galleries_insert_own"
on public.galleries
for insert
to authenticated
with check (user_id = auth.uid());

drop policy if exists "galleries_update_own" on public.galleries;
create policy "galleries_update_own"
on public.galleries
for update
to authenticated
using (user_id = auth.uid())
with check (user_id = auth.uid());

drop policy if exists "galleries_delete_own" on public.galleries;
create policy "galleries_delete_own"
on public.galleries
for delete
to authenticated
using (user_id = auth.uid());

drop policy if exists "subgalleries_select_own" on public.subgalleries;
create policy "subgalleries_select_own"
on public.subgalleries
for select
to authenticated
using (user_id = auth.uid());

drop policy if exists "subgalleries_insert_own" on public.subgalleries;
create policy "subgalleries_insert_own"
on public.subgalleries
for insert
to authenticated
with check (user_id = auth.uid());

drop policy if exists "subgalleries_update_own" on public.subgalleries;
create policy "subgalleries_update_own"
on public.subgalleries
for update
to authenticated
using (user_id = auth.uid())
with check (user_id = auth.uid());

drop policy if exists "subgalleries_delete_own" on public.subgalleries;
create policy "subgalleries_delete_own"
on public.subgalleries
for delete
to authenticated
using (user_id = auth.uid());

drop policy if exists "photos_select_own" on public.photos;
create policy "photos_select_own"
on public.photos
for select
to authenticated
using (user_id = auth.uid());

drop policy if exists "photos_insert_own" on public.photos;
create policy "photos_insert_own"
on public.photos
for insert
to authenticated
with check (user_id = auth.uid());

drop policy if exists "photos_update_own" on public.photos;
create policy "photos_update_own"
on public.photos
for update
to authenticated
using (user_id = auth.uid())
with check (user_id = auth.uid());

drop policy if exists "photos_delete_own" on public.photos;
create policy "photos_delete_own"
on public.photos
for delete
to authenticated
using (user_id = auth.uid());

insert into storage.buckets (id, name, public)
values ('gallery-images', 'gallery-images', false)
on conflict (id) do update set public = excluded.public;

drop policy if exists "gallery_images_select_own" on storage.objects;
create policy "gallery_images_select_own"
on storage.objects
for select
to authenticated
using (
  bucket_id = 'gallery-images'
  and split_part(name, '/', 1) = auth.uid()::text
);

drop policy if exists "gallery_images_insert_own" on storage.objects;
create policy "gallery_images_insert_own"
on storage.objects
for insert
to authenticated
with check (
  bucket_id = 'gallery-images'
  and split_part(name, '/', 1) = auth.uid()::text
);

drop policy if exists "gallery_images_update_own" on storage.objects;
create policy "gallery_images_update_own"
on storage.objects
for update
to authenticated
using (
  bucket_id = 'gallery-images'
  and split_part(name, '/', 1) = auth.uid()::text
)
with check (
  bucket_id = 'gallery-images'
  and split_part(name, '/', 1) = auth.uid()::text
);

drop policy if exists "gallery_images_delete_own" on storage.objects;
create policy "gallery_images_delete_own"
on storage.objects
for delete
to authenticated
using (
  bucket_id = 'gallery-images'
  and split_part(name, '/', 1) = auth.uid()::text
);
