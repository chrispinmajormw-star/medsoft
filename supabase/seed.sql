-- Sample data for Lilongwe. Run AFTER schema.sql.
-- Safe to re-run: it skips facilities whose name already exists.
insert into public.facilities
  (name, type, lat, lng, is_24h, open_time, close_time, phone, address, city, rating, reviews_count, stock)
select * from (values
  ('Kamuzu Central Pharmacy', 'pharmacy', -13.9558, 33.7812, false, '07:00'::time, '20:00'::time, '+265 991 234 567', 'Kamuzu Rd, Area 9', 'Lilongwe', 4.8, 132, array['Amoxicillin','Paracetamol','ORS Sachets','Insulin','Malaria test kits']),
  ('Area 18 Community Clinic', 'hospital', -13.9701, 33.7699, true, null::time, null::time, '+265 991 555 210', 'Presidential Way, Area 18', 'Lilongwe', 4.6, 98, array['Emergency care','Maternity ward','X-ray','Blood tests','Wound dressing']),
  ('City Centre Chemist', 'pharmacy', -13.9612, 33.7688, false, '08:00'::time, '18:00'::time, '+265 991 887 340', 'Convention Dr, City Centre', 'Lilongwe', 4.3, 57, array['Ibuprofen','Cough syrup','Antihistamines','Contraceptives']),
  ('Lilongwe General Hospital', 'hospital', -13.9789, 33.7825, true, null::time, null::time, '+265 991 900 112', 'Mchinji Rd, Area 4', 'Lilongwe', 4.5, 410, array['Emergency care','Surgery','ICU','Oxygen','Blood transfusion']),
  ('Old Town Pharmacy', 'pharmacy', -13.974, 33.7601, false, '07:30'::time, '19:00'::time, '+265 991 442 908', 'Malangalanga Rd, Old Town', 'Lilongwe', 4.4, 76, array['Paracetamol','Amoxicillin','Vitamins','Diabetes test strips']),
  ('Area 25 Health Post', 'hospital', -13.945, 33.777, false, '07:00'::time, '17:00'::time, '+265 991 310 664', 'Area 25 Roundabout', 'Lilongwe', 4.2, 41, array['General consultation','Vaccination','Malaria test kits','ORS Sachets']),
  ('Capital Hill Pharmacy', 'pharmacy', -13.9495, 33.7655, false, '08:00'::time, '21:00'::time, '+265 991 763 205', 'Capital Hill, City Centre', 'Lilongwe', 4.7, 89, array['Antibiotics','Painkillers','Insulin','Baby formula']),
  ('Riverside Medical Centre', 'hospital', -13.9903, 33.769, false, '08:00'::time, '16:00'::time, '+265 991 628 471', 'Riverside Dr, Area 3', 'Lilongwe', 4.1, 63, array['General consultation','Dental care','Eye clinic','X-ray'])
) as v(name, type, lat, lng, is_24h, open_time, close_time, phone, address, city, rating, reviews_count, stock)
where not exists (select 1 from public.facilities f where f.name = v.name);
