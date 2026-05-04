-- Public Memora pages: optional, opt-in public profile per user.
--
-- Adds:
--   profiles.public_handle text unique (lowercase, 3-30, [a-z0-9_-])
--   profiles.public_display_name text  (max 60 chars)
--   profiles.public_bio text           (max 280 chars)
--   profiles.is_public_profile_enabled boolean default false
--   galleries.is_on_public_profile boolean default false
--
-- A gallery appears on /@handle iff:
--   profiles.is_public_profile_enabled = true
--   AND profiles.public_handle = <handle>
--   AND galleries.is_on_public_profile = true
--
-- Reads on /@handle go through the service-role admin client with
-- explicit filters (mirrors the /share/[token] pattern). No new
-- `to anon` RLS policies are added; existing owner-scoped RLS on
-- profiles + galleries stays untouched.
--
-- The existing tokenized share flow (shares + share_galleries) is
-- independent of these columns and continues to work unchanged.

alter table public.profiles
  add column if not exists public_handle text,
  add column if not exists public_display_name text,
  add column if not exists public_bio text,
  add column if not exists is_public_profile_enabled boolean not null default false;

-- Length caps mirror the UI (Settings + public page render):
--   public_display_name : 60 chars
--   public_bio          : 280 chars
alter table public.profiles
  drop constraint if exists profiles_public_display_name_length_chk;
alter table public.profiles
  add constraint profiles_public_display_name_length_chk
  check (
    public_display_name is null
    or char_length(public_display_name) <= 60
  );

alter table public.profiles
  drop constraint if exists profiles_public_bio_length_chk;
alter table public.profiles
  add constraint profiles_public_bio_length_chk
  check (
    public_bio is null
    or char_length(public_bio) <= 280
  );

-- Handle format: lowercase only, 3-30 chars, [a-z0-9_-]. Reserved-route
-- list is also enforced in lib/public-profile.ts so the client gets a
-- friendly error before the round-trip; the DB constraint is the
-- backstop against a misbehaving client.
alter table public.profiles
  drop constraint if exists profiles_public_handle_format_chk;
alter table public.profiles
  add constraint profiles_public_handle_format_chk
  check (
    public_handle is null
    or public_handle ~ '^[a-z0-9_-]{3,30}$'
  );

-- Reserved-handle list. Mirrored in lib/public-profile.ts (RESERVED_HANDLES).
-- Keep the two in sync — adding a new top-level route requires updating both.
alter table public.profiles
  drop constraint if exists profiles_public_handle_reserved_chk;
alter table public.profiles
  add constraint profiles_public_handle_reserved_chk
  check (
    public_handle is null
    or public_handle not in (
      'admin','administrator','api','app','apps','assets','auth','billing',
      'checkout','dashboard','demo','docs','email-confirmed','error',
      'galleries','gallery','help','home','legal','login','logout','onboarding',
      'pricing','privacy','public','reset-password','robots','root','share',
      'shares','signin','signup','sitemap','site','static','support','settings',
      'system','terms','user','users','welcome','www'
    )
  );

create unique index if not exists profiles_public_handle_unique
  on public.profiles(public_handle)
  where public_handle is not null;

alter table public.galleries
  add column if not exists is_on_public_profile boolean not null default false;

-- Fast lookup of a user's public galleries when rendering /@handle.
create index if not exists galleries_public_profile_idx
  on public.galleries(user_id)
  where is_on_public_profile = true;
