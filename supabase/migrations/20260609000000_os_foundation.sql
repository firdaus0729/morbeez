-- Morbeez OS foundation: pincode geography, farm_blocks as source of truth,
-- recommendation_records, weather rules, product gap queue, RBAC extensions.

-- ─── Pincode master (normalized geography) ─────────────────
CREATE TABLE IF NOT EXISTS pincode_master (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  pincode CHAR(6) NOT NULL,
  village TEXT,
  taluk TEXT NOT NULL,
  district TEXT NOT NULL,
  state TEXT NOT NULL DEFAULT 'Kerala',
  latitude DECIMAL(9, 6),
  longitude DECIMAL(9, 6),
  active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT pincode_master_pincode_unique UNIQUE (pincode)
);

CREATE INDEX IF NOT EXISTS idx_pincode_master_district ON pincode_master (district, taluk);
CREATE INDEX IF NOT EXISTS idx_pincode_master_pincode ON pincode_master (pincode) WHERE active = true;

-- Sample Kerala pincodes (extend via admin import)
INSERT INTO pincode_master (pincode, village, taluk, district, state)
SELECT * FROM (VALUES
  ('685612', 'Painavu', 'Idukki', 'Idukki', 'Kerala'),
  ('673592', 'Sulthan Bathery', 'Sultan Bathery', 'Wayanad', 'Kerala'),
  ('682001', 'Kochi', 'Kochi', 'Ernakulam', 'Kerala'),
  ('680001', 'Thrissur', 'Thrissur', 'Thrissur', 'Kerala')
) AS v(pincode, village, taluk, district, state)
WHERE NOT EXISTS (SELECT 1 FROM pincode_master LIMIT 1);

ALTER TABLE farmers
  ADD COLUMN IF NOT EXISTS pincode_id UUID REFERENCES pincode_master(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_farmers_pincode ON farmers (pincode_id);

-- ─── Farm blocks: canonical agriculture entity ───────────────
ALTER TABLE farm_blocks
  ADD COLUMN IF NOT EXISTS crop_type TEXT,
  ADD COLUMN IF NOT EXISTS crop_category TEXT,
  ADD COLUMN IF NOT EXISTS crop_subtype TEXT,
  ADD COLUMN IF NOT EXISTS plot_label TEXT,
  ADD COLUMN IF NOT EXISTS pincode_id UUID REFERENCES pincode_master(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS is_primary BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS stage TEXT,
  ADD COLUMN IF NOT EXISTS season TEXT,
  ADD COLUMN IF NOT EXISTS irrigation_type TEXT,
  ADD COLUMN IF NOT EXISTS acreage_decimal DECIMAL(10, 2);

-- Backfill crop_type from crop_name
UPDATE farm_blocks SET crop_type = lower(trim(crop_name))
WHERE crop_type IS NULL AND crop_name IS NOT NULL;

UPDATE farm_blocks SET crop_type = 'ginger' WHERE crop_type IS NULL;

-- Migrate farmer_crops → farm_blocks (one-time)
INSERT INTO farm_blocks (
  farmer_id, name, crop_name, crop_type, plot_label, planting_date,
  acreage_decimal, stage, is_primary, season, created_at, updated_at
)
SELECT
  fc.farmer_id,
  COALESCE(fc.plot_label, initcap(fc.crop_type) || ' Plot'),
  initcap(fc.crop_type),
  lower(fc.crop_type),
  fc.plot_label,
  COALESCE(fc.planted_at, (fc.created_at AT TIME ZONE 'Asia/Kolkata')::date),
  fc.acreage,
  fc.stage,
  COALESCE(fc.is_primary, false),
  fc.season,
  fc.created_at,
  NOW()
FROM farmer_crops fc
WHERE NOT EXISTS (
  SELECT 1 FROM farm_blocks fb
  WHERE fb.farmer_id = fc.farmer_id
    AND lower(COALESCE(fb.crop_type, '')) = lower(fc.crop_type)
    AND fb.planting_date IS NOT DISTINCT FROM COALESCE(fc.planted_at, (fc.created_at AT TIME ZONE 'Asia/Kolkata')::date)
);

-- Conversation sessions: active block (replaces active_plot_id semantics)
ALTER TABLE conversation_sessions
  ADD COLUMN IF NOT EXISTS active_block_id UUID REFERENCES farm_blocks(id) ON DELETE SET NULL;

UPDATE conversation_sessions cs
SET active_block_id = fb.id
FROM farm_blocks fb
WHERE cs.active_block_id IS NULL
  AND cs.active_plot_id IS NOT NULL
  AND fb.id = cs.active_plot_id;

-- Cultivation activities → block_id
ALTER TABLE cultivation_activities
  ADD COLUMN IF NOT EXISTS block_id UUID REFERENCES farm_blocks(id) ON DELETE SET NULL;

UPDATE cultivation_activities ca
SET block_id = COALESCE(ca.farmer_crop_id, ca.block_id)
WHERE ca.block_id IS NULL AND ca.farmer_crop_id IS NOT NULL;

UPDATE cultivation_activities ca
SET block_id = fb.id
FROM farm_blocks fb
WHERE ca.block_id IS NULL
  AND ca.farmer_crop_id IS NOT NULL
  AND fb.id = ca.farmer_crop_id;

-- AI sessions link to block
ALTER TABLE ai_advisory_sessions
  ADD COLUMN IF NOT EXISTS block_id UUID REFERENCES farm_blocks(id) ON DELETE SET NULL;

-- ─── Canonical recommendation records ──────────────────────
CREATE TABLE IF NOT EXISTS recommendation_records (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  farmer_id UUID NOT NULL REFERENCES farmers(id) ON DELETE CASCADE,
  block_id UUID REFERENCES farm_blocks(id) ON DELETE SET NULL,
  lead_id UUID REFERENCES leads(id) ON DELETE SET NULL,
  ai_session_id UUID REFERENCES ai_advisory_sessions(id) ON DELETE SET NULL,
  crm_recommendation_id UUID REFERENCES crm_recommendations(id) ON DELETE SET NULL,
  source TEXT NOT NULL DEFAULT 'rule' CHECK (
    source IN ('ai', 'agronomist', 'rule', 'template', 'field_finding')
  ),
  issue_detected TEXT,
  recommendation_text TEXT NOT NULL,
  products JSONB NOT NULL DEFAULT '[]',
  dosage TEXT,
  application_type TEXT,
  weather_warning TEXT,
  dap_at_recommendation INT,
  language TEXT NOT NULL DEFAULT 'en',
  status TEXT NOT NULL DEFAULT 'draft' CHECK (
    status IN (
      'draft',
      'pending_approval',
      'approved',
      'rejected',
      'communicated',
      'applied',
      'outcome_recorded',
      'cancelled'
    )
  ),
  outcome TEXT CHECK (outcome IN ('better', 'partial', 'no_improvement', 'unknown')),
  outcome_notes TEXT,
  outcome_at TIMESTAMPTZ,
  created_by TEXT,
  reviewed_by TEXT,
  approved_by TEXT,
  approved_at TIMESTAMPTZ,
  communicated_at TIMESTAMPTZ,
  metadata JSONB NOT NULL DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_recommendation_records_farmer ON recommendation_records (farmer_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_recommendation_records_block ON recommendation_records (block_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_recommendation_records_status ON recommendation_records (status, created_at DESC);

-- ─── Weather / disease rules (versioned, agronomist-managed) ─
CREATE TABLE IF NOT EXISTS weather_rule_definitions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  rule_key TEXT NOT NULL,
  version INT NOT NULL DEFAULT 1,
  crop_type TEXT,
  crop_category TEXT,
  district TEXT,
  condition_json JSONB NOT NULL DEFAULT '{}',
  action_type TEXT NOT NULL,
  action_payload JSONB NOT NULL DEFAULT '{}',
  priority INT NOT NULL DEFAULT 50,
  effective_from DATE NOT NULL DEFAULT CURRENT_DATE,
  effective_to DATE,
  status TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'approved', 'archived')),
  created_by TEXT,
  approved_by TEXT,
  approved_at TIMESTAMPTZ,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT weather_rule_key_version_unique UNIQUE (rule_key, version)
);

CREATE INDEX IF NOT EXISTS idx_weather_rules_active
  ON weather_rule_definitions (status, effective_from, crop_type);

-- Seed example rules
INSERT INTO weather_rule_definitions (rule_key, version, crop_type, condition_json, action_type, action_payload, status, approved_by, approved_at)
SELECT * FROM (VALUES
  (
    'block_foliar_heavy_rain',
    1,
    NULL::text,
    '{"rain_probability_pct":{"gt":70}}'::jsonb,
    'block_action',
    '{"blocked":["foliar_spray"],"message_en":"Heavy rain expected — avoid foliar spray today."}'::jsonb,
    'approved',
    'system',
    NOW()
  ),
  (
    'recommend_drainage_heavy_rain',
    1,
    'ginger',
    '{"rainfall_mm_24h":{"gt":80}}'::jsonb,
    'recommend_task',
    '{"task":"drainage_cleaning","priority":"high"}'::jsonb,
    'approved',
    'system',
    NOW()
  )
) AS v(rule_key, version, crop_type, condition_json, action_type, action_payload, status, approved_by, approved_at)
WHERE NOT EXISTS (SELECT 1 FROM weather_rule_definitions LIMIT 1);

-- ─── Product gap queue (aggregated technical demand) ─────────
CREATE TABLE IF NOT EXISTS product_gap_queue (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  technical_name TEXT NOT NULL,
  crop_type TEXT,
  crop_subtype TEXT,
  district TEXT,
  recommendation_count INT NOT NULL DEFAULT 0,
  urgency TEXT NOT NULL DEFAULT 'normal' CHECK (urgency IN ('low', 'normal', 'high', 'critical')),
  status TEXT NOT NULL DEFAULT 'open' CHECK (status IN ('open', 'reviewing', 'sourced', 'dismissed')),
  sample_recommendation_ids UUID[] DEFAULT '{}',
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_product_gap_unique
  ON product_gap_queue (lower(technical_name), COALESCE(lower(crop_type), ''), COALESCE(district, ''));

-- ─── RBAC: extended roles + module permissions ─────────────
ALTER TABLE admin_users DROP CONSTRAINT IF EXISTS admin_users_role_check;

ALTER TABLE admin_users
  ADD CONSTRAINT admin_users_role_check CHECK (
    role IN (
      'super_admin',
      'admin',
      'operations',
      'agronomist',
      'telecaller',
      'manager',
      'viewer'
    )
  );

-- Map legacy roles
UPDATE admin_users SET role = 'super_admin' WHERE role = 'admin';
UPDATE admin_users SET role = 'operations' WHERE role = 'manager';

CREATE TABLE IF NOT EXISTS role_module_permissions (
  role TEXT NOT NULL,
  module_key TEXT NOT NULL,
  can_read BOOLEAN NOT NULL DEFAULT false,
  can_write BOOLEAN NOT NULL DEFAULT false,
  PRIMARY KEY (role, module_key)
);

INSERT INTO role_module_permissions (role, module_key, can_read, can_write)
SELECT * FROM (VALUES
  ('super_admin', 'dashboard', true, true),
  ('super_admin', 'telecaller_crm', true, true),
  ('super_admin', 'operations', true, true),
  ('super_admin', 'intelligence', true, true),
  ('super_admin', 'agronomist', true, true),
  ('super_admin', 'commerce', true, true),
  ('super_admin', 'automation', true, true),
  ('super_admin', 'analytics', true, true),
  ('super_admin', 'settings', true, true),
  ('super_admin', 'approve_recommendations', true, true),
  ('operations', 'dashboard', true, false),
  ('operations', 'telecaller_crm', true, true),
  ('operations', 'operations', true, true),
  ('operations', 'intelligence', true, false),
  ('operations', 'commerce', true, true),
  ('operations', 'automation', true, true),
  ('operations', 'analytics', true, false),
  ('agronomist', 'dashboard', true, false),
  ('agronomist', 'telecaller_crm', true, true),
  ('agronomist', 'intelligence', true, true),
  ('agronomist', 'agronomist', true, true),
  ('agronomist', 'commerce', true, false),
  ('agronomist', 'analytics', true, false),
  ('telecaller', 'dashboard', true, false),
  ('telecaller', 'telecaller_crm', true, true),
  ('telecaller', 'commerce', true, false),
  ('viewer', 'dashboard', true, false),
  ('viewer', 'telecaller_crm', true, false),
  ('viewer', 'commerce', true, false)
) AS v(role, module_key, can_read, can_write)
ON CONFLICT (role, module_key) DO NOTHING;

-- Broadcast rules: optional block-level filter later
ALTER TABLE crop_dap_broadcast_rules
  ADD COLUMN IF NOT EXISTS crop_category TEXT,
  ADD COLUMN IF NOT EXISTS crop_subtype TEXT;

-- RLS
ALTER TABLE pincode_master ENABLE ROW LEVEL SECURITY;
ALTER TABLE recommendation_records ENABLE ROW LEVEL SECURITY;
ALTER TABLE weather_rule_definitions ENABLE ROW LEVEL SECURITY;
ALTER TABLE product_gap_queue ENABLE ROW LEVEL SECURITY;
ALTER TABLE role_module_permissions ENABLE ROW LEVEL SECURITY;

CREATE POLICY pincode_master_service ON pincode_master FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY recommendation_records_service ON recommendation_records FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY weather_rule_definitions_service ON weather_rule_definitions FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY product_gap_queue_service ON product_gap_queue FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY role_module_permissions_service ON role_module_permissions FOR ALL USING (true) WITH CHECK (true);

COMMENT ON TABLE farm_blocks IS 'Canonical agriculture block — crop, DAP, pincode, all modules reference block_id';
COMMENT ON TABLE recommendation_records IS 'Canonical recommendation + outcome for analytics and learning';
COMMENT ON TABLE farmer_crops IS 'DEPRECATED — migrate to farm_blocks; do not use in new code';
