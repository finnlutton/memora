-- Persist the visual theme that a public share page should render in.
-- Without this, the share page inherited the *viewer's* saved theme from
-- localStorage, which meant a Dusk-using viewer saw a Dusk share even when
-- the sender wanted Harbor. Storing the choice on the share row lets each
-- link render in the theme its creator picked at share-creation time.
--
-- Constrained to the same enum the app already enforces in lib/theme.ts.
-- Default 'harbor' so existing rows keep rendering exactly as before.

alter table public.shares
  add column if not exists theme_id text not null default 'harbor';

alter table public.shares
  drop constraint if exists shares_theme_id_check;

alter table public.shares
  add constraint shares_theme_id_check
  check (theme_id in ('harbor', 'grove', 'dusk'));
