-- Morbeez Calcium Nitrate tank-mix compatibility chart (WhatsApp + intelligence masters)

INSERT INTO spray_compatibility_rules (product_a, product_b, compatible, min_interval_hours, notes, active)
SELECT v.product_a, v.product_b, v.compatible, v.min_interval_hours, v.notes, true
FROM (VALUES
  ('Calcium Nitrate', 'Urea', true, NULL::int, 'Morbeez chart: compatible'),
  ('Calcium Nitrate', 'Potassium Nitrate', true, NULL::int, '13-0-45; Morbeez chart: compatible'),
  ('Calcium Nitrate', 'Boron (Solubor)', true, NULL::int, 'Morbeez chart: compatible'),
  ('Calcium Nitrate', 'Amino Acids', true, NULL::int, 'Morbeez chart: compatible'),
  ('Calcium Nitrate', 'Protein Hydrolysate', true, NULL::int, 'Morbeez chart: compatible'),
  ('Calcium Nitrate', 'Light Seaweed Extract', true, NULL::int, 'Low dose only; Morbeez chart'),
  ('Calcium Nitrate', 'Fulvic Acid', true, NULL::int, 'Low dose only; Morbeez chart'),
  ('Calcium Nitrate', 'Chelated Micronutrients (EDTA)', true, NULL::int, 'Morbeez chart: compatible'),
  ('Calcium Nitrate', 'MAP (12-61-0)', false, 24, 'Phosphate sources — do not tank mix'),
  ('Calcium Nitrate', 'MKP (00-52-34)', false, 24, 'Precipitation risk; never with CaNO3+MgSO4'),
  ('Calcium Nitrate', 'DAP (18-46-0)', false, 24, 'Phosphate — do not tank mix'),
  ('Calcium Nitrate', 'Phosphoric Acid', false, 24, 'Do not tank mix'),
  ('Calcium Nitrate', 'Potassium Phosphite', false, 24, 'Do not tank mix'),
  ('Calcium Nitrate', 'Phosphonic Acid', false, 24, 'Precipitation with Ca+Mg; separate tanks'),
  ('Calcium Nitrate', 'Magnesium Sulphate', false, 24, 'Sulphate precipitates with calcium — separate application'),
  ('Calcium Nitrate', 'Ammonium Sulphate', false, 24, 'Do not tank mix'),
  ('Calcium Nitrate', 'Potassium Sulphate (SOP)', false, 24, 'Do not tank mix'),
  ('Calcium Nitrate', 'ZnSO₄ / FeSO₄ / MnSO₄', false, 24, 'Sulphate salts — do not tank mix'),
  ('Calcium Nitrate', 'Humic Acid Flakes', false, NULL::int, 'Do not tank mix'),
  ('Calcium Nitrate', 'Lime / Bicarbonates', false, NULL::int, 'Do not tank mix'),
  ('Calcium Nitrate', 'Oil-Based Pesticides', false, NULL::int, 'Do not tank mix')
) AS v(product_a, product_b, compatible, min_interval_hours, notes)
WHERE NOT EXISTS (
  SELECT 1 FROM spray_compatibility_rules r
  WHERE lower(r.product_a) = lower(v.product_a)
    AND lower(r.product_b) = lower(v.product_b)
);
