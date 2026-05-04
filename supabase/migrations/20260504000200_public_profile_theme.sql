-- Public Memora pages: per-profile theme.
--
-- Lets a user pick which palette their /@handle page renders in,
-- mirroring the per-share theme picker on tokenized share links.
-- Defaults to NULL = the app default (Harbor).
--
-- Allowed values mirror lib/theme.ts THEME_IDS and the theme_id check
-- on the shares table (20260430000100_shares_theme.sql).

alter table public.profiles
  add column if not exists public_profile_theme_id text;

alter table public.profiles
  drop constraint if exists profiles_public_profile_theme_id_chk;
alter table public.profiles
  add constraint profiles_public_profile_theme_id_chk
  check (
    public_profile_theme_id is null
    or public_profile_theme_id in ('harbor', 'grove', 'dusk')
  );
