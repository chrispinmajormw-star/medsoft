-- =====================================================================
-- Medsoft database schema for Supabase
-- Run this once in: Supabase Dashboard -> SQL Editor -> New query -> Run
-- Then run seed.sql to load the sample Lilongwe facilities.
-- Safe to re-run.
-- =====================================================================

-- ---------- helpers ----------
create or replace function public.set_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

-- ---------- facilities (pharmacies + hospitals) ----------
create table if not exists public.facilities (
  id            bigint generated always as identity primary key,
  name          text not null,
  type          text not null check (type in ('pharmacy', 'hospital')),
  lat           double precision not null check (lat between -90 and 90),
  lng           double precision not null check (lng between -180 and 180),
  is_24h        boolean not null default false,
  open_time     time,             -- local time (Africa/Blantyre), ignored when is_24h
  close_time    time,             -- may be earlier than open_time for overnight hours
  phone         text,
  address       text,
  city          text default 'Lilongwe',
  rating        numeric(2,1) not null default 0 check (rating between 0 and 5),
  reviews_count integer not null default 0,
  stock         text[] not null default '{}',   -- medicines / services available
  verified      boolean not null default true,
  is_active     boolean not null default true,  -- set false to hide without deleting
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now()
);

create index if not exists facilities_type_idx  on public.facilities (type);
create index if not exists facilities_stock_idx on public.facilities using gin (stock);

drop trigger if exists facilities_updated_at on public.facilities;
create trigger facilities_updated_at before update on public.facilities
  for each row execute function public.set_updated_at();

alter table public.facilities enable row level security;

-- Anyone (signed in or not) can read active facilities.
drop policy if exists "Facilities are publicly readable" on public.facilities;
create policy "Facilities are publicly readable"
  on public.facilities for select
  to anon, authenticated
  using (is_active);
-- No insert/update/delete policies: edit facilities from the Supabase
-- dashboard (Table Editor) or with the service_role key on a server.

-- ---------- profiles (one per auth user) ----------
create table if not exists public.profiles (
  id         uuid primary key references auth.users (id) on delete cascade,
  full_name  text,
  city       text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

drop trigger if exists profiles_updated_at on public.profiles;
create trigger profiles_updated_at before update on public.profiles
  for each row execute function public.set_updated_at();

alter table public.profiles enable row level security;

drop policy if exists "Users read own profile" on public.profiles;
create policy "Users read own profile"
  on public.profiles for select to authenticated
  using ((select auth.uid()) = id);

drop policy if exists "Users insert own profile" on public.profiles;
create policy "Users insert own profile"
  on public.profiles for insert to authenticated
  with check ((select auth.uid()) = id);

drop policy if exists "Users update own profile" on public.profiles;
create policy "Users update own profile"
  on public.profiles for update to authenticated
  using ((select auth.uid()) = id)
  with check ((select auth.uid()) = id);

-- Create a profile automatically when someone signs up.
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer set search_path = ''
as $$
begin
  insert into public.profiles (id, full_name)
  values (new.id, new.raw_user_meta_data ->> 'full_name')
  on conflict (id) do nothing;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- ---------- saved facilities (bookmarks) ----------
create table if not exists public.saved_facilities (
  user_id     uuid not null default auth.uid() references auth.users (id) on delete cascade,
  facility_id bigint not null references public.facilities (id) on delete cascade,
  created_at  timestamptz not null default now(),
  primary key (user_id, facility_id)
);

create index if not exists saved_facilities_facility_idx on public.saved_facilities (facility_id);

alter table public.saved_facilities enable row level security;

drop policy if exists "Users read own saved" on public.saved_facilities;
create policy "Users read own saved"
  on public.saved_facilities for select to authenticated
  using ((select auth.uid()) = user_id);

drop policy if exists "Users add own saved" on public.saved_facilities;
create policy "Users add own saved"
  on public.saved_facilities for insert to authenticated
  with check ((select auth.uid()) = user_id);

drop policy if exists "Users remove own saved" on public.saved_facilities;
create policy "Users remove own saved"
  on public.saved_facilities for delete to authenticated
  using ((select auth.uid()) = user_id);

-- ---------- API access ----------
-- RLS above decides which rows; these grants decide which tables the API exposes.
grant usage on schema public to anon, authenticated;
grant select on public.facilities to anon, authenticated;
grant select, insert, update on public.profiles to authenticated;
grant select, insert, delete on public.saved_facilities to authenticated;
