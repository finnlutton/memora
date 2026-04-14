create table if not exists public.shares (
  id uuid primary key default gen_random_uuid(),
  owner_user_id uuid not null references auth.users(id) on delete cascade,
  token text not null,
  message text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  revoked_at timestamptz
);

create table if not exists public.share_galleries (
  id uuid primary key default gen_random_uuid(),
  share_id uuid not null references public.shares(id) on delete cascade,
  gallery_id uuid not null references public.galleries(id) on delete cascade,
  created_at timestamptz not null default now()
);

create unique index if not exists shares_token_key on public.shares(token);
create unique index if not exists share_galleries_share_gallery_key on public.share_galleries(share_id, gallery_id);
create index if not exists shares_owner_user_id_idx on public.shares(owner_user_id);
create index if not exists share_galleries_share_id_idx on public.share_galleries(share_id);
create index if not exists share_galleries_gallery_id_idx on public.share_galleries(gallery_id);

drop trigger if exists set_shares_updated_at on public.shares;
create trigger set_shares_updated_at
before update on public.shares
for each row execute function public.set_updated_at();

alter table public.shares enable row level security;
alter table public.share_galleries enable row level security;

drop policy if exists "shares_select_own" on public.shares;
create policy "shares_select_own"
on public.shares
for select
to authenticated
using (owner_user_id = auth.uid());

drop policy if exists "shares_insert_own" on public.shares;
create policy "shares_insert_own"
on public.shares
for insert
to authenticated
with check (owner_user_id = auth.uid());

drop policy if exists "shares_update_own" on public.shares;
create policy "shares_update_own"
on public.shares
for update
to authenticated
using (owner_user_id = auth.uid())
with check (owner_user_id = auth.uid());

drop policy if exists "shares_delete_own" on public.shares;
create policy "shares_delete_own"
on public.shares
for delete
to authenticated
using (owner_user_id = auth.uid());

drop policy if exists "share_galleries_select_own" on public.share_galleries;
create policy "share_galleries_select_own"
on public.share_galleries
for select
to authenticated
using (
  exists (
    select 1
    from public.shares s
    where s.id = share_galleries.share_id
      and s.owner_user_id = auth.uid()
  )
);

drop policy if exists "share_galleries_insert_own" on public.share_galleries;
create policy "share_galleries_insert_own"
on public.share_galleries
for insert
to authenticated
with check (
  exists (
    select 1
    from public.shares s
    where s.id = share_galleries.share_id
      and s.owner_user_id = auth.uid()
  )
  and exists (
    select 1
    from public.galleries g
    where g.id = share_galleries.gallery_id
      and g.user_id = auth.uid()
  )
);

drop policy if exists "share_galleries_delete_own" on public.share_galleries;
create policy "share_galleries_delete_own"
on public.share_galleries
for delete
to authenticated
using (
  exists (
    select 1
    from public.shares s
    where s.id = share_galleries.share_id
      and s.owner_user_id = auth.uid()
  )
);
