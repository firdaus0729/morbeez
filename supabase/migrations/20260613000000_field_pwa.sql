-- Phase 6: Field PWA — visit questionnaires + photo storage

CREATE TABLE IF NOT EXISTS field_visit_questionnaire (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  crop_type TEXT NOT NULL,
  question_key TEXT NOT NULL,
  label_en TEXT NOT NULL,
  label_ml TEXT,
  input_type TEXT NOT NULL DEFAULT 'text' CHECK (
    input_type IN ('text', 'number', 'select', 'boolean', 'rating')
  ),
  options JSONB NOT NULL DEFAULT '[]',
  required BOOLEAN NOT NULL DEFAULT false,
  sort_order INT NOT NULL DEFAULT 0,
  active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (crop_type, question_key)
);

CREATE INDEX IF NOT EXISTS idx_field_visit_questionnaire_crop
  ON field_visit_questionnaire (crop_type, sort_order)
  WHERE active = true;

ALTER TABLE field_visit_questionnaire ENABLE ROW LEVEL SECURITY;
CREATE POLICY field_visit_questionnaire_service ON field_visit_questionnaire
  FOR ALL USING (true) WITH CHECK (true);

-- Default questionnaire (ginger + generic fallback)
INSERT INTO field_visit_questionnaire (crop_type, question_key, label_en, label_ml, input_type, options, required, sort_order)
VALUES
  ('ginger', 'leaf_stage', 'Leaf growth stage', 'ഇല വളർച്ചാ ഘട്ടം', 'select',
   '["Seedling","Vegetative","Tillering","Mature"]'::jsonb, true, 10),
  ('ginger', 'spad', 'SPAD reading (optional)', NULL, 'number', '[]'::jsonb, false, 20),
  ('ginger', 'soil_moisture', 'Soil moisture feel', 'മണ്ണിന്റെ ഈർപ്പം', 'select',
   '["Dry","Moist","Wet","Waterlogged"]'::jsonb, true, 30),
  ('ginger', 'pest_pressure', 'Pest / disease pressure', NULL, 'select',
   '["None","Low","Medium","High"]'::jsonb, true, 40),
  ('ginger', 'farmer_applied', 'Farmer already applied treatment?', NULL, 'boolean', '[]'::jsonb, false, 50),
  ('_default', 'leaf_stage', 'Crop growth stage', NULL, 'select',
   '["Early","Vegetative","Flowering","Fruit/Mature","Harvest"]'::jsonb, true, 10),
  ('_default', 'soil_moisture', 'Soil moisture', NULL, 'select',
   '["Dry","Moist","Wet"]'::jsonb, false, 20),
  ('_default', 'pest_pressure', 'Pest / disease pressure', NULL, 'select',
   '["None","Low","Medium","High"]'::jsonb, true, 30),
  ('_default', 'irrigation', 'Irrigation status', NULL, 'select',
   '["Adequate","Needs irrigation","Excess water"]'::jsonb, false, 40)
ON CONFLICT (crop_type, question_key) DO NOTHING;

-- Supabase storage bucket for field visit photos (public read for staff console)
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'field-visits',
  'field-visits',
  true,
  5242880,
  ARRAY['image/jpeg', 'image/png', 'image/webp', 'image/heic']
)
ON CONFLICT (id) DO NOTHING;

CREATE POLICY field_visits_storage_read ON storage.objects
  FOR SELECT USING (bucket_id = 'field-visits');

CREATE POLICY field_visits_storage_insert ON storage.objects
  FOR INSERT WITH CHECK (bucket_id = 'field-visits');

CREATE POLICY field_visits_storage_update ON storage.objects
  FOR UPDATE USING (bucket_id = 'field-visits');

CREATE POLICY field_visits_storage_delete ON storage.objects
  FOR DELETE USING (bucket_id = 'field-visits');
