-- =====================================================================
-- Medsoft update 003: strictly one facility per account.
-- Run AFTER 002_accounts_and_admin.sql. Safe to re-run.
-- =====================================================================

-- If any account already owns more than one facility, this stops with a
-- clear message and lists them, instead of failing halfway.
do $$
declare
  dupes text;
begin
  select string_agg(owner_id::text || ' owns ' || n || ' facilities', E'\n')
    into dupes
  from (select owner_id, count(*) as n from public.facilities
        where owner_id is not null group by owner_id having count(*) > 1) d;
  if dupes is not null then
    raise exception E'Some accounts own more than one facility. Fix these first (delete the extras or clear their owner_id in Table Editor -> facilities), then run this again:\n%', dupes;
  end if;
end;
$$;

-- The rule itself: an owner can appear on at most one facility.
-- (Facilities with no owner, like the seeded ones, are not affected.)
create unique index if not exists facilities_one_per_owner
  on public.facilities (owner_id)
  where owner_id is not null;
