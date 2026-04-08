alter table public.profiles
alter column membership_tier drop default;

alter table public.profiles
alter column membership_tier drop not null;
