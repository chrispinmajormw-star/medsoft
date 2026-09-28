-- =====================================================================
-- Medsoft update 004: services offered, kept separate from medicines.
-- Run AFTER 003_one_facility_per_account.sql. Safe to re-run.
-- =====================================================================

-- Each row in facility_stock is now either a medicine or a service.
alter table public.facility_stock add column if not exists kind text not null default 'medicine';
alter table public.facility_stock drop constraint if exists facility_stock_kind_check;
-- Includes 'equipment' (from 005) so running 004 late never removes it.
alter table public.facility_stock add constraint facility_stock_kind_check check (kind in ('medicine', 'service', 'equipment'));

-- status keeps the same three values; the app shows them per kind:
--   medicine: in_stock = In stock,  low = Running low, out = Out of stock
--   service:  in_stock = Available, low = Limited,     out = Unavailable

-- Move the services that came with the sample data into the new kind.
update public.facility_stock
set kind = 'service'
where kind = 'medicine'
  and item in (
    'Emergency care', 'Maternity ward', 'X-ray', 'Blood tests', 'Wound dressing', 'Surgery', 'ICU',
    'Oxygen', 'Blood transfusion', 'General consultation', 'Vaccination', 'Dental care', 'Eye clinic'
  );

create index if not exists facility_stock_kind_idx on public.facility_stock (facility_id, kind);
