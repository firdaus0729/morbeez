-- Demo farmers and farm blocks (Agronomist + Telecaller)
-- Requires: m2 foundation + crm masters blocks migrations

INSERT INTO farmers (id, phone, name, preferred_language, district, state, village, source)
VALUES
  (
    'd0000000-0000-4000-8000-000000000001',
    '+919876543201',
    'Ravi Kumar',
    'ml',
    'Idukki',
    'Kerala',
    'Vandanmedu',
    'demo_seed'
  ),
  (
    'd0000000-0000-4000-8000-000000000002',
    '+919876543202',
    'Lakshmi Nair',
    'en',
    'Wayanad',
    'Kerala',
    'Kalpetta',
    'demo_seed'
  ),
  (
    'd0000000-0000-4000-8000-000000000003',
    '+919876543203',
    'Suresh Menon',
    'en',
    'Thrissur',
    'Kerala',
    'Chalakudy',
    'demo_seed'
  )
ON CONFLICT (id) DO UPDATE SET
  name = EXCLUDED.name,
  district = EXCLUDED.district,
  village = EXCLUDED.village;

INSERT INTO farm_blocks (id, farmer_id, name, crop_name, crop_type, plot_label, planting_date, is_primary)
VALUES
  (
    'd0000000-0000-4000-8000-000000000011',
    'd0000000-0000-4000-8000-000000000001',
    'Cardamom Block A',
    'Cardamom',
    'cardamom',
    'Plot 1',
    CURRENT_DATE - INTERVAL '45 days',
    true
  ),
  (
    'd0000000-0000-4000-8000-000000000012',
    'd0000000-0000-4000-8000-000000000002',
    'Ginger North',
    'Ginger',
    'ginger',
    'North field',
    CURRENT_DATE - INTERVAL '30 days',
    true
  ),
  (
    'd0000000-0000-4000-8000-000000000013',
    'd0000000-0000-4000-8000-000000000003',
    'Banana cluster',
    'Banana',
    'banana',
    'B-2',
    CURRENT_DATE - INTERVAL '60 days',
    true
  )
ON CONFLICT (id) DO UPDATE SET
  name = EXCLUDED.name,
  crop_type = EXCLUDED.crop_type,
  crop_name = EXCLUDED.crop_name,
  plot_label = EXCLUDED.plot_label;
