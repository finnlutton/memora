-- Per-cover focal point for the editorial card frames. Default 50/50 keeps
-- existing rows centered (identical to today's `object-cover` framing); users
-- can drag the photo within the frame on upload or via gallery edit to choose
-- what stays in view, which mainly matters for vertical photos that would
-- otherwise be aggressively cropped.

alter table public.galleries
  add column if not exists cover_image_focal_x real not null default 50,
  add column if not exists cover_image_focal_y real not null default 50;

alter table public.subgalleries
  add column if not exists cover_image_focal_x real not null default 50,
  add column if not exists cover_image_focal_y real not null default 50;
