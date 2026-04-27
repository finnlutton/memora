-- Clipboard — loose-memory MVP
--
-- A lightweight surface for users to drop quick text, photos, or a
-- text+photo combo without organizing them into galleries. Each card
-- belongs to one user and can carry a free-form 2D position so the
-- desktop canvas can render them as a memory board.
--
-- Storage:
--   Photos live in the existing `gallery-images` bucket under the path
--   `{userId}/clipboard/{id}-{ts}.{ext}`. The bucket's existing RLS
--   policies (split_part(name, '/', 1) = auth.uid()::text) already
--   scope per-user access — no new storage policies required.

create table if not exists public.clipboard_items (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  content text,
  photo_path text,
  x_position double precision,
  y_position double precision,
  layout_type text not null
    check (layout_type in ('text', 'photo', 'text_photo')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists clipboard_items_user_id_created_at_idx
  on public.clipboard_items(user_id, created_at desc);

-- Reuse the project's set_updated_at() trigger function (defined in
-- 20260327001500_memora_core.sql).
drop trigger if exists set_clipboard_items_updated_at on public.clipboard_items;
create trigger set_clipboard_items_updated_at
before update on public.clipboard_items
for each row execute function public.set_updated_at();

alter table public.clipboard_items enable row level security;

drop policy if exists "clipboard_items_select_own" on public.clipboard_items;
create policy "clipboard_items_select_own"
on public.clipboard_items
for select
to authenticated
using (user_id = auth.uid());

drop policy if exists "clipboard_items_insert_own" on public.clipboard_items;
create policy "clipboard_items_insert_own"
on public.clipboard_items
for insert
to authenticated
with check (user_id = auth.uid());

drop policy if exists "clipboard_items_update_own" on public.clipboard_items;
create policy "clipboard_items_update_own"
on public.clipboard_items
for update
to authenticated
using (user_id = auth.uid())
with check (user_id = auth.uid());

drop policy if exists "clipboard_items_delete_own" on public.clipboard_items;
create policy "clipboard_items_delete_own"
on public.clipboard_items
for delete
to authenticated
using (user_id = auth.uid());
