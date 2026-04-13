alter table public.galleries
  add column if not exists location_lat double precision,
  add column if not exists location_lng double precision;

alter table public.subgalleries
  add column if not exists location_lat double precision,
  add column if not exists location_lng double precision;
