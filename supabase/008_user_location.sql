-- =====================================================================
-- Medsoft update 008: location chosen by the user (no built-in default city).
-- Needs 002. Safe to re-run.
-- =====================================================================

-- A user's chosen location, synced across their devices.
--   location_mode 'device' = follow the phone's GPS
--   location_mode 'chosen' = a place they picked (search or map pin)
alter table public.profiles add column if not exists location_mode  text;
alter table public.profiles add column if not exists location_lat   double precision;
alter table public.profiles add column if not exists location_lng   double precision;
alter table public.profiles add column if not exists location_label text;

alter table public.profiles drop constraint if exists profiles_location_mode_check;
alter table public.profiles add constraint profiles_location_mode_check
  check (location_mode is null or location_mode in ('device', 'chosen'));
alter table public.profiles drop constraint if exists profiles_location_coords_check;
alter table public.profiles add constraint profiles_location_coords_check
  check ((location_lat is null or location_lat between -90 and 90)
     and (location_lng is null or location_lng between -180 and 180));

-- Users can write their own location (column-level grants from 002 list each column).
grant insert (location_mode, location_lat, location_lng, location_label) on public.profiles to authenticated;
grant update (location_mode, location_lat, location_lng, location_label) on public.profiles to authenticated;

-- Facilities no longer get a city by default; each facility sets its own.
alter table public.facilities alter column city drop default;
