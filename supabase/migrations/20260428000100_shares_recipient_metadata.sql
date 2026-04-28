-- Capture who a share link was created for so the public landing
-- page can greet the recipients by name. Two new optional columns on
-- public.shares:
--
--   recipient_group_name   — the chosen group's display name, e.g.
--                            'Family'. NULL for shares created
--                            without a group selection.
--   recipient_member_labels — flat list of names included in the
--                            chosen group(s), e.g. ARRAY['Mom','Dad'].
--                            Empty array (the default) preserves
--                            backward compatibility for existing rows.
--
-- The values are recipient-facing copy only; they're not used for any
-- ACL decision (the share token alone gates access).

alter table public.shares
  add column if not exists recipient_group_name text;

alter table public.shares
  add column if not exists recipient_member_labels text[] not null default array[]::text[];
