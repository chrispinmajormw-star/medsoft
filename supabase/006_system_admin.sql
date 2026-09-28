-- =====================================================================
-- Medsoft update 006: system admin dashboard.
-- Needs 002-005. Safe to re-run.
--
-- System admins are listed in their own table. Nobody can add themselves
-- from the app; you add an admin here, in the SQL Editor (see the bottom).
-- =====================================================================

-- ---------------------------------------------------------------------
-- 1. Who is a system admin
-- ---------------------------------------------------------------------
create table if not exists public.system_admins (
  user_id    uuid primary key references auth.users (id) on delete cascade,
  created_at timestamptz not null default now()
);

alter table public.system_admins enable row level security;

drop policy if exists "Admins can see their own admin row" on public.system_admins;
create policy "Admins can see their own admin row"
  on public.system_admins for select to authenticated
  using (user_id = (select auth.uid()));

-- Read-only from the app. Adding/removing admins is SQL-Editor only.
revoke all on public.system_admins from anon, authenticated;
grant select on public.system_admins to authenticated;

create or replace function public.is_system_admin()
returns boolean
language sql stable
security definer set search_path = ''
as $$
  select exists (select 1 from public.system_admins a where a.user_id = (select auth.uid()));
$$;
grant execute on function public.is_system_admin() to anon, authenticated;

-- ---------------------------------------------------------------------
-- 2. Review fields on facilities (read by everyone, written only by admins)
-- ---------------------------------------------------------------------
alter table public.facilities add column if not exists review_note text;   -- reason shown to the facility when rejected
alter table public.facilities add column if not exists reviewed_at timestamptz;
-- Facility accounts have column-level update grants (from 002) that do NOT
-- include these columns, so they cannot clear a rejection themselves.

-- System admins can see every facility, including pending and hidden ones
-- (this also lets live map updates reach the admin dashboard).
drop policy if exists "Facilities are publicly readable" on public.facilities;
create policy "Facilities are publicly readable"
  on public.facilities for select
  to anon, authenticated
  using ((is_active and verified) or owner_id = (select auth.uid()) or (select public.is_system_admin()));

-- When a facility edits a rejected listing, send it back to the review queue
-- (clear the reason). Also keeps 002's rule: renaming or changing type needs re-verification.
create or replace function public.guard_facility_verification()
returns trigger language plpgsql as $$
begin
  if (select auth.role()) = 'authenticated' then
    if new.name is distinct from old.name or new.type is distinct from old.type then
      new.verified := false;
    end if;
    if not new.verified and old.review_note is not null and (
         new.name, new.type, new.lat, new.lng, new.phone, new.address, new.city,
         new.is_24h, new.open_time, new.close_time, new.notice, new.is_active
       ) is distinct from (
         old.name, old.type, old.lat, old.lng, old.phone, old.address, old.city,
         old.is_24h, old.open_time, old.close_time, old.notice, old.is_active
       ) then
      new.review_note := null;  -- back to "Pending review"
    end if;
  end if;
  return new;
end;
$$;

-- ---------------------------------------------------------------------
-- 3. Admin actions (each checks the caller is a system admin)
-- ---------------------------------------------------------------------
drop function if exists public.admin_list_facilities();
create function public.admin_list_facilities()
returns table (
  id bigint, name text, type text, lat double precision, lng double precision,
  phone text, address text, city text, is_24h boolean, open_time time, close_time time, notice text,
  verified boolean, is_active boolean, review_note text, reviewed_at timestamptz,
  created_at timestamptz, updated_at timestamptz,
  owner_id uuid, owner_email text, owner_name text,
  medicines integer, services integer, equipment integer
)
language plpgsql stable
security definer set search_path = ''
as $$
#variable_conflict use_column
begin
  if not public.is_system_admin() then
    raise exception 'Only system admins can do this' using errcode = '42501';
  end if;
  return query
    select f.id, f.name, f.type, f.lat, f.lng, f.phone, f.address, f.city, f.is_24h, f.open_time, f.close_time, f.notice,
           f.verified, f.is_active, f.review_note, f.reviewed_at, f.created_at, f.updated_at,
           f.owner_id, u.email::text, p.full_name,
           (select count(*)::int from public.facility_stock s where s.facility_id = f.id and s.kind = 'medicine'),
           (select count(*)::int from public.facility_stock s where s.facility_id = f.id and s.kind = 'service'),
           (select count(*)::int from public.facility_stock s where s.facility_id = f.id and s.kind = 'equipment')
    from public.facilities f
    left join auth.users u on u.id = f.owner_id
    left join public.profiles p on p.id = f.owner_id
    order by f.created_at desc;
end;
$$;

-- Approve (p_approve = true) or reject/suspend with a reason (p_approve = false).
create or replace function public.admin_review_facility(p_id bigint, p_approve boolean, p_note text default null)
returns void
language plpgsql
security definer set search_path = ''
as $$
begin
  if not public.is_system_admin() then
    raise exception 'Only system admins can do this' using errcode = '42501';
  end if;
  if not p_approve and coalesce(trim(p_note), '') = '' then
    raise exception 'Give a reason so the facility knows what to fix';
  end if;
  update public.facilities
  set verified    = p_approve,
      review_note = case when p_approve then null else trim(p_note) end,
      reviewed_at = now()
  where id = p_id;
  if not found then
    raise exception 'Facility % not found', p_id;
  end if;
end;
$$;

create or replace function public.admin_stats()
returns json
language plpgsql stable
security definer set search_path = ''
as $$
declare
  result json;
begin
  if not public.is_system_admin() then
    raise exception 'Only system admins can do this' using errcode = '42501';
  end if;
  select json_build_object(
    'pending',  (select count(*) from public.facilities where not verified and review_note is null),
    'rejected', (select count(*) from public.facilities where not verified and review_note is not null),
    'live',     (select count(*) from public.facilities where verified and is_active),
    'hidden',   (select count(*) from public.facilities where verified and not is_active),
    'users',    (select count(*) from public.profiles),
    'facility_accounts', (select count(*) from public.profiles where role = 'facility_admin')
  ) into result;
  return result;
end;
$$;

revoke execute on function public.admin_list_facilities() from public, anon;
revoke execute on function public.admin_review_facility(bigint, boolean, text) from public, anon;
revoke execute on function public.admin_stats() from public, anon;
grant execute on function public.admin_list_facilities() to authenticated;
grant execute on function public.admin_review_facility(bigint, boolean, text) to authenticated;
grant execute on function public.admin_stats() to authenticated;

-- ---------------------------------------------------------------------
-- 4. MAKE YOURSELF A SYSTEM ADMIN
--    First create a normal account in the app with your email, then run
--    this line (with your email) on its own:
--
--    insert into public.system_admins (user_id)
--    select id from auth.users where email = 'you@example.com'
--    on conflict do nothing;
--
--    To remove an admin:
--    delete from public.system_admins
--    where user_id = (select id from auth.users where email = 'you@example.com');
-- ---------------------------------------------------------------------
