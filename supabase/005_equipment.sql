-- =====================================================================
-- Medsoft update 005: medications, services and equipment.
-- Self-contained: works whether or not 004_services.sql was run first.
-- Needs 002_accounts_and_admin.sql (creates facility_stock). Safe to re-run.
--
-- facility_stock.kind is one of:
--   medicine  = medications (drugs)      levels: In stock / Running low / Out of stock
--   service   = healthcare services      levels: Available / Limited / Unavailable
--   equipment = equipment/machines sold  levels: In stock / Running low / Out of stock
-- =====================================================================

-- 1. The kind column (from 004; skipped if it already exists).
alter table public.facility_stock add column if not exists kind text not null default 'medicine';

-- 2. Allowed kinds, now including equipment.
alter table public.facility_stock drop constraint if exists facility_stock_kind_check;
alter table public.facility_stock add constraint facility_stock_kind_check
  check (kind in ('medicine', 'service', 'equipment'));

-- 3. Move the sample services into the service kind (from 004; harmless if already done).
update public.facility_stock
set kind = 'service'
where kind = 'medicine'
  and item in (
    'Emergency care', 'Maternity ward', 'X-ray', 'Blood tests', 'Wound dressing', 'Surgery', 'ICU',
    'Oxygen', 'Blood transfusion', 'General consultation', 'Vaccination', 'Dental care', 'Eye clinic'
  );

create index if not exists facility_stock_kind_idx on public.facility_stock (facility_id, kind);
