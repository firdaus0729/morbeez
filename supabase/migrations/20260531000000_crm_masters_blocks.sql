-- CRM masters, farm blocks, soil reports, recommendations, enriched interactions

-- ─── Unified master data (dynamic dropdowns) ───
CREATE TABLE IF NOT EXISTS crm_masters (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  master_type TEXT NOT NULL,
  name TEXT NOT NULL,
  parent_id UUID REFERENCES crm_masters(id) ON DELETE SET NULL,
  category TEXT,
  description TEXT,
  icon_color TEXT,
  metadata JSONB DEFAULT '{}',
  sort_order INT NOT NULL DEFAULT 0,
  active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_crm_masters_unique
  ON crm_masters (master_type, lower(name), COALESCE(parent_id, '00000000-0000-0000-0000-000000000000'::uuid));

CREATE INDEX IF NOT EXISTS idx_crm_masters_type ON crm_masters (master_type, active, sort_order);

-- ─── Farm blocks ───
CREATE TABLE IF NOT EXISTS farm_blocks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  farmer_id UUID NOT NULL REFERENCES farmers(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  area TEXT,
  crop_id UUID REFERENCES crm_masters(id) ON DELETE SET NULL,
  crop_name TEXT,
  variety_id UUID REFERENCES crm_masters(id) ON DELETE SET NULL,
  variety_name TEXT,
  irrigation_type_id UUID REFERENCES crm_masters(id) ON DELETE SET NULL,
  soil_type_id UUID REFERENCES crm_masters(id) ON DELETE SET NULL,
  growth_stage_id UUID REFERENCES crm_masters(id) ON DELETE SET NULL,
  block_status_id UUID REFERENCES crm_masters(id) ON DELETE SET NULL,
  planting_date DATE,
  spacing TEXT,
  soil_health TEXT DEFAULT 'good' CHECK (soil_health IN ('good', 'medium', 'critical')),
  growth_percent INT DEFAULT 0 CHECK (growth_percent >= 0 AND growth_percent <= 100),
  last_visit_at TIMESTAMPTZ,
  archived_at TIMESTAMPTZ,
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_farm_blocks_farmer ON farm_blocks (farmer_id) WHERE archived_at IS NULL;

-- ─── Farmer ↔ agronomist assignment ───
CREATE TABLE IF NOT EXISTS farmer_agronomist_assignments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  farmer_id UUID NOT NULL REFERENCES farmers(id) ON DELETE CASCADE,
  agronomist_name TEXT NOT NULL,
  employee_id TEXT,
  mobile TEXT,
  email TEXT,
  specialization TEXT,
  assigned_since DATE,
  last_review_at TIMESTAMPTZ,
  next_visit_at TIMESTAMPTZ,
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'on_leave', 'inactive')),
  assigned_block_ids UUID[] DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_farmer_agronomist_active
  ON farmer_agronomist_assignments (farmer_id) WHERE status = 'active';

-- ─── Soil reports ───
CREATE TABLE IF NOT EXISTS crm_soil_reports (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  farmer_id UUID NOT NULL REFERENCES farmers(id) ON DELETE CASCADE,
  block_id UUID REFERENCES farm_blocks(id) ON DELETE SET NULL,
  reported_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  pdf_url TEXT,
  metrics JSONB NOT NULL DEFAULT '{}',
  uploaded_by TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_soil_reports_block ON crm_soil_reports (block_id, reported_at DESC);

-- ─── CRM recommendations (operational, distinct from AI session recs) ───
CREATE TABLE IF NOT EXISTS crm_recommendations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  farmer_id UUID NOT NULL REFERENCES farmers(id) ON DELETE CASCADE,
  lead_id UUID REFERENCES leads(id) ON DELETE SET NULL,
  block_id UUID REFERENCES farm_blocks(id) ON DELETE SET NULL,
  rec_type TEXT NOT NULL DEFAULT 'agronomist' CHECK (rec_type IN ('ai', 'agronomist', 'spray', 'drench')),
  problem TEXT,
  recommendation TEXT NOT NULL,
  products JSONB DEFAULT '[]',
  dosage TEXT,
  application_method TEXT,
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'pending', 'completed', 'cancelled')),
  recommended_by TEXT,
  follow_up_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_crm_recommendations_farmer ON crm_recommendations (farmer_id, created_at DESC);

-- ─── Field findings: link to block ───
ALTER TABLE crm_field_findings
  ADD COLUMN IF NOT EXISTS block_id UUID REFERENCES farm_blocks(id) ON DELETE SET NULL;

-- ─── Interactions: CRM fields ───
ALTER TABLE interaction_logs
  ADD COLUMN IF NOT EXISTS lead_id UUID REFERENCES leads(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS block_id UUID REFERENCES farm_blocks(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS interaction_type TEXT,
  ADD COLUMN IF NOT EXISTS done_by TEXT,
  ADD COLUMN IF NOT EXISTS done_by_role TEXT,
  ADD COLUMN IF NOT EXISTS summary TEXT,
  ADD COLUMN IF NOT EXISTS next_action TEXT,
  ADD COLUMN IF NOT EXISTS next_action_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'completed';

CREATE INDEX IF NOT EXISTS idx_interactions_type ON interaction_logs (farmer_id, interaction_type);

-- RLS
ALTER TABLE crm_masters ENABLE ROW LEVEL SECURITY;
ALTER TABLE farm_blocks ENABLE ROW LEVEL SECURITY;
ALTER TABLE farmer_agronomist_assignments ENABLE ROW LEVEL SECURITY;
ALTER TABLE crm_soil_reports ENABLE ROW LEVEL SECURITY;
ALTER TABLE crm_recommendations ENABLE ROW LEVEL SECURITY;

CREATE POLICY crm_masters_service ON crm_masters FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY farm_blocks_service ON farm_blocks FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY farmer_agronomist_service ON farmer_agronomist_assignments FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY crm_soil_reports_service ON crm_soil_reports FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY crm_recommendations_service ON crm_recommendations FOR ALL USING (true) WITH CHECK (true);

-- Seed default masters
INSERT INTO crm_masters (master_type, name, sort_order) VALUES
  ('crop', 'Banana', 1), ('crop', 'Pepper', 2), ('crop', 'Paddy', 3), ('crop', 'Ginger', 4), ('crop', 'Wheat', 5),
  ('irrigation_type', 'Drip', 1), ('irrigation_type', 'Sprinkler', 2), ('irrigation_type', 'Flood', 3),
  ('soil_type', 'Loamy', 1), ('soil_type', 'Clay', 2), ('soil_type', 'Sandy', 3),
  ('growth_stage', 'Vegetative', 1), ('growth_stage', 'Flowering', 2), ('growth_stage', 'Fruiting', 3),
  ('block_status', 'Active', 1), ('block_status', 'Under Monitoring', 2),
  ('disease', 'Nutrient Deficiency', 1), ('disease', 'Leaf Spot', 2), ('disease', 'Healthy', 3),
  ('pest', 'Aphids', 1), ('pest', 'Thrips', 2),
  ('interaction_type', 'Call', 1), ('interaction_type', 'WhatsApp', 2), ('interaction_type', 'Recommendation', 3),
  ('interaction_type', 'Lead Created', 4), ('interaction_type', 'Follow-up', 5), ('interaction_type', 'Order', 6),
  ('interaction_type', 'Field Visit', 7), ('interaction_type', 'Soil Report Uploaded', 8),
  ('interaction_type', 'Reminder', 9), ('interaction_type', 'AI Diagnosis', 10),
  ('recommendation_type', 'Foliar Spray', 1), ('recommendation_type', 'Soil Application', 2),
  ('application_method', 'Foliar Spray', 1), ('application_method', 'Drench', 2), ('application_method', 'Soil Drench', 3),
  ('payment_mode', 'UPI', 1), ('payment_mode', 'COD', 2), ('payment_mode', 'Card', 3),
  ('priority', 'High', 1), ('priority', 'Normal', 2), ('priority', 'Low', 3),
  ('visit_type', 'Routine', 1), ('visit_type', 'Emergency', 2),
  ('moisture_status', 'Adequate', 1), ('moisture_status', 'Low', 2),
  ('pest_pressure', 'Low', 1), ('pest_pressure', 'Moderate', 2), ('pest_pressure', 'High', 3),
  ('plant_condition', 'Good', 1), ('plant_condition', 'Fair', 2);
