-- Manual gallery ordering on the workspace /galleries page.
--
-- `display_order` is nullable on purpose: NULL means "user has never
-- reordered, fall back to updated_at DESC". Once a user reorders, every
-- visible gallery in their workspace gets an explicit integer (0..N-1)
-- so the chosen order is fully deterministic across sessions.

alter table public.galleries
  add column if not exists display_order integer;

create index if not exists galleries_user_display_order_idx
  on public.galleries(user_id, display_order);
