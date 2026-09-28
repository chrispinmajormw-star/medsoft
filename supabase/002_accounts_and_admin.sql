-- =====================================================================
-- Medsoft update 002: user settings, facility admin accounts,
-- facility ownership, stock levels and live map updates.
--
-- Run AFTER schema.sql (and seed.sql). Safe to re-run.
-- Supabase Dashboard -> SQL Editor -> New query -> paste -> Run
-- =====================================================================

-- ---------------------------------------------------------------------
-- 1. Profiles: account type + settings
-- ---------------------------------------------------------------------
alter table public.profiles add column if not exists role text not null default 'user';
alter table public.profiles add column if not exists phone text;
alter table public.profiles add column if not exists default_radius_km integer not null default 5;
alter table public.profiles add column if not exists theme text not null default 'system';

alter table public.profiles drop constraint if exists profiles_role_check;
alter table public.profiles add constraint profiles_role_check check (role in ('user', 'facility_admin'));
alter table public.profiles drop constraint if exists profiles_radius_check;
alter table public.profiles add constraint profiles_radius_check check (default_radius_km between 1 and 50);
alter table public.profiles drop constraint if exists profiles_theme_check;
alter table public.profiles add constraint profiles_theme_check check (theme in ('system', 'light', 'dark'));

-- Sign-up now records the account type chosen in the app.
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer set search_path = ''
as $$
begin
  insert into public.profiles (id, full_name, role)
  values (
    new.id,
    new.raw_user_meta_data ->> 'full_name',
    case when new.raw_user_meta_data ->> 'account_type' = 'facility_admin' then 'facility_admin' else 'user' end
  )
  on conflict (id) do nothing;
  return new;
end;
$$;

-- Users may only write these profile columns (never id).
revoke insert, update on public.profiles from anon, authenticated;
grant insert (id, full_name, city, phone, default_radius_km, theme, role) on public.profiles to authenticated;
grant update (full_name, city, phone, default_radius_km, theme, role) on public.profiles to authenticated;

-- ---------------------------------------------------------------------
-- 2. Facilities: owners, clinics, notices, verification
-- ---------------------------------------------------------------------
alter table public.facilities add column if not exists owner_id uuid references auth.users (id) on delete set null default auth.uid();
alter table public.facilities add column if not exists notice text;
alter table public.facilities add column if not exists stock_updated_at timestamptz;
alter table public.facilities alter column verified set default false;  -- new listings wait for approval

alter table public.facilities drop constraint if exists facilities_type_check;
alter table public.facilities add constraint facilities_type_check check (type in ('pharmacy', 'clinic', 'hospital'));

create index if not exists facilities_owner_idx on public.facilities (owner_id);

-- Public sees verified, active places. Owners also see their own listings.
drop policy if exists "Facilities are publicly readable" on public.facilities;
create policy "Facilities are publicly readable"
  on public.facilities for select
  to anon, authenticated
  using ((is_active and verified) or owner_id = (select auth.uid()));

drop policy if exists "Facility admins create facilities" on public.facilities;
create policy "Facility admins create facilities"
  on public.facilities for insert to authenticated
  with check (
    owner_id = (select auth.uid())
    and exists (select 1 from public.profiles p where p.id = (select auth.uid()) and p.role = 'facility_admin')
  );

drop policy if exists "Owners update their facilities" on public.facilities;
create policy "Owners update their facilities"
  on public.facilities for update to authenticated
  using (owner_id = (select auth.uid()))
  with check (owner_id = (select auth.uid()));

drop policy if exists "Owners delete their facilities" on public.facilities;
create policy "Owners delete their facilities"
  on public.facilities for delete to authenticated
  using (owner_id = (select auth.uid()));

-- Admins can edit their details, but never verified, owner_id, rating or reviews.
revoke insert, update on public.facilities from anon, authenticated;
grant insert (name, type, lat, lng, is_24h, open_time, close_time, phone, address, city, notice, is_active)
  on public.facilities to authenticated;
grant update (name, type, lat, lng, is_24h, open_time, close_time, phone, address, city, notice, is_active)
  on public.facilities to authenticated;
grant delete on public.facilities to authenticated;

-- Renaming or changing the type of a listing sends it back for verification.
create or replace function public.guard_facility_verification()
returns trigger language plpgsql as $$
begin
  if (select auth.role()) = 'authenticated'
     and (new.name is distinct from old.name or new.type is distinct from old.type) then
    new.verified := false;
  end if;
  return new;
end;
$$;

drop trigger if exists facilities_guard_verification on public.facilities;
create trigger facilities_guard_verification before update on public.facilities
  for each row execute function public.guard_facility_verification();

-- ---------------------------------------------------------------------
-- 3. Stock with levels (replaces the old facilities.stock text list)
-- ---------------------------------------------------------------------
create table if not exists public.facility_stock (
  id          bigint generated always as identity primary key,
  facility_id bigint not null references public.facilities (id) on delete cascade,
  item        text not null check (length(trim(item)) between 1 and 80),
  status      text not null default 'in_stock' check (status in ('in_stock', 'low', 'out')),
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now(),
  unique (facility_id, item)
);

create index if not exists facility_stock_facility_idx on public.facility_stock (facility_id);

drop trigger if exists facility_stock_updated_at on public.facility_stock;
create trigger facility_stock_updated_at before update on public.facility_stock
  for each row execute function public.set_updated_at();

-- Copy the existing text-list stock into the new table (once).
insert into public.facility_stock (facility_id, item)
select f.id, trim(s.item)
from public.facilities f, unnest(f.stock) as s(item)
where trim(s.item) <> ''
on conflict (facility_id, item) do nothing;

-- Keep facilities.stock_updated_at current, so users see "stock updated 2 hours ago".
create or replace function public.touch_facility_stock()
returns trigger
language plpgsql
security definer set search_path = ''
as $$
begin
  update public.facilities set stock_updated_at = now()
  where id = coalesce(new.facility_id, old.facility_id);
  return null;
end;
$$;

drop trigger if exists facility_stock_touch on public.facility_stock;
create trigger facility_stock_touch after insert or update or delete on public.facility_stock
  for each row execute function public.touch_facility_stock();

alter table public.facility_stock enable row level security;

-- Stock is visible whenever its facility is visible (the facilities policy applies inside).
drop policy if exists "Stock is readable with its facility" on public.facility_stock;
create policy "Stock is readable with its facility"
  on public.facility_stock for select to anon, authenticated
  using (exists (select 1 from public.facilities f where f.id = facility_id));

drop policy if exists "Owners manage stock" on public.facility_stock;
create policy "Owners manage stock"
  on public.facility_stock for all to authenticated
  using (exists (select 1 from public.facilities f where f.id = facility_id and f.owner_id = (select auth.uid())))
  with check (exists (select 1 from public.facilities f where f.id = facility_id and f.owner_id = (select auth.uid())));

grant select on public.facility_stock to anon, authenticated;
grant insert, update, delete on public.facility_stock to authenticated;

-- ---------------------------------------------------------------------
-- 4. Live updates on the map (Supabase Realtime)
-- ---------------------------------------------------------------------
do $$
begin
  if not exists (select 1 from pg_publication_tables where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = 'facilities') then
    alter publication supabase_realtime add table public.facilities;
  end if;
  if not exists (select 1 from pg_publication_tables where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = 'facility_stock') then
    alter publication supabase_realtime add table public.facility_stock;
  end if;
end;
$$;

-- ---------------------------------------------------------------------
-- Optional, later: once the new app version is live everywhere, the old
-- text-list column is no longer used and can be dropped:
--   alter table public.facilities drop column stock;
-- ---------------------------------------------------------------------
