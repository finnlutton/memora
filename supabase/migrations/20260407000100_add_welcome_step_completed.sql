alter table public.profiles
add column if not exists welcome_step_completed boolean not null default false;

update public.profiles
set welcome_step_completed = true
where welcome_step_completed = false;

drop policy if exists "profiles_insert_own" on public.profiles;
create policy "profiles_insert_own"
on public.profiles
for insert
to authenticated
with check (id = auth.uid());
