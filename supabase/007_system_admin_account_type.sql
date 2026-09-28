-- =====================================================================
-- Medsoft update 007: System admin is its own account type.
-- Needs 006. Safe to re-run.
--
-- A system admin account:
--   * is never a facility account (profiles.role stays 'user')
--   * can never own a facility (no conflict of interest when approving)
--   * cannot change its account type from the app
-- =====================================================================

-- 1. Fix existing admin accounts: they are not facility accounts.
update public.profiles
set role = 'user'
where role <> 'user'
  and id in (select user_id from public.system_admins);

-- Admins must not own a facility. If yours does (e.g. a test pharmacy),
-- this stops and tells you which, so you can decide what to do with it.
do $$
declare
  owned text;
begin
  select string_agg(format('"%s" (id %s, %s) owned by %s', f.name, f.id, f.type, u.email), E'\n')
    into owned
  from public.facilities f
  join public.system_admins a on a.user_id = f.owner_id
  left join auth.users u on u.id = f.owner_id;
  if owned is not null then
    raise exception E'A system admin account owns a facility. Admin accounts cannot own facilities.\n%\n\nFix it with ONE of these, then run this file again:\n  delete from public.facilities where id = <id>;              -- remove a test listing\n  update public.facilities set owner_id = null where id = <id>; -- keep it, no owner', owned;
  end if;
end;
$$;

-- 2. Adding an admin: refuse accounts that own a facility, and make the profile a plain user.
create or replace function public.prepare_system_admin()
returns trigger
language plpgsql
security definer set search_path = ''
as $$
declare
  fac text;
begin
  select name into fac from public.facilities where owner_id = new.user_id limit 1;
  if fac is not null then
    raise exception 'This account owns the facility "%". Use a separate account as system admin, or remove that facility first.', fac;
  end if;
  update public.profiles set role = 'user' where id = new.user_id and role <> 'user';
  return new;
end;
$$;

drop trigger if exists system_admins_prepare on public.system_admins;
create trigger system_admins_prepare before insert on public.system_admins
  for each row execute function public.prepare_system_admin();

-- 3. A system admin cannot switch itself to a facility account.
create or replace function public.guard_profile_role()
returns trigger
language plpgsql
security definer set search_path = ''
as $$
begin
  if new.role = 'facility_admin'
     and exists (select 1 from public.system_admins a where a.user_id = new.id) then
    raise exception 'System admin accounts cannot manage a facility. Use a separate account for your facility.';
  end if;
  return new;
end;
$$;

drop trigger if exists profiles_guard_role on public.profiles;
create trigger profiles_guard_role before insert or update of role on public.profiles
  for each row execute function public.guard_profile_role();

-- 4. A system admin cannot create a facility (belt and braces on top of 3).
drop policy if exists "Facility admins create facilities" on public.facilities;
create policy "Facility admins create facilities"
  on public.facilities for insert to authenticated
  with check (
    owner_id = (select auth.uid())
    and exists (select 1 from public.profiles p where p.id = (select auth.uid()) and p.role = 'facility_admin')
    and not (select public.is_system_admin())
  );

-- ---------------------------------------------------------------------
-- Check your admin accounts (run on its own any time):
--   select u.email, p.full_name, p.role,
--          (select count(*) from public.facilities f where f.owner_id = u.id) as facilities_owned
--   from public.system_admins a
--   join auth.users u on u.id = a.user_id
--   left join public.profiles p on p.id = a.user_id;
-- Expected: role = user, facilities_owned = 0
-- ---------------------------------------------------------------------
