-- Clipboard — per-item photo size
--
-- Users now choose how prominent a clipboard photo should be.
-- "small" / "medium" / "large" map to width on the desktop drag canvas
-- and to photo aspect ratio on the mobile masonry. Existing items
-- inherit "medium" so no card visibly changes on rollout.

alter table public.clipboard_items
  add column if not exists photo_size text not null default 'medium'
  check (photo_size in ('small', 'medium', 'large'));
