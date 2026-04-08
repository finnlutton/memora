alter table public.profiles
add column if not exists has_seen_welcome boolean not null default false;

update public.profiles
set has_seen_welcome = true
where has_seen_welcome = false;
