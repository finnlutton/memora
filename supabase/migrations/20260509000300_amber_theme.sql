-- Add 'amber' to the theme_id allowlist on shares + public_profiles.
--
-- Mirrors the lib/theme.ts THEME_IDS expansion to four palettes
-- (Harbor, Grove, Dusk, Amber). Without this, attempting to save an
-- amber-themed share or public profile would fail the existing
-- shares_theme_id_check / profiles_public_profile_theme_id_chk
-- constraints introduced in 20260430000100_shares_theme.sql and
-- 20260504000200_public_profile_theme.sql.

alter table public.shares
  drop constraint if exists shares_theme_id_check;

alter table public.shares
  add constraint shares_theme_id_check
  check (theme_id in ('harbor', 'grove', 'dusk', 'amber'));

alter table public.profiles
  drop constraint if exists profiles_public_profile_theme_id_chk;

alter table public.profiles
  add constraint profiles_public_profile_theme_id_chk
  check (
    public_profile_theme_id is null
    or public_profile_theme_id in ('harbor', 'grove', 'dusk', 'amber')
  );
