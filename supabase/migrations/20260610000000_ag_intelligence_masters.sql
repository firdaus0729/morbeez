-- Phase 4 — Agriculture intelligence masters

CREATE TABLE IF NOT EXISTS cultivation_task_master (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  crop_type TEXT NOT NULL,
  crop_category TEXT,
  task_key TEXT NOT NULL,
  title_en TEXT NOT NULL,
  title_ml TEXT,
  instructions_en TEXT,
  instructions_ml TEXT,
  target_dap_min INT,
  target_dap_max INT,
  growth_stage TEXT,
  priority INT NOT NULL DEFAULT 50,
  active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT cultivation_task_crop_key_unique UNIQUE (crop_type, task_key)
);

CREATE INDEX IF NOT EXISTS idx_cultivation_task_crop_dap
  ON cultivation_task_master (crop_type, target_dap_min, target_dap_max)
  WHERE active = true;

CREATE TABLE IF NOT EXISTS recommendation_templates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  crop_type TEXT NOT NULL,
  issue_key TEXT NOT NULL,
  issue_label_en TEXT,
  issue_label_ml TEXT,
  recommendation_text_en TEXT NOT NULL,
  recommendation_text_ml TEXT,
  products JSONB NOT NULL DEFAULT '[]',
  application_type TEXT,
  status TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'approved', 'archived')),
  approved_by TEXT,
  approved_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT recommendation_template_crop_issue UNIQUE (crop_type, issue_key)
);

CREATE INDEX IF NOT EXISTS idx_recommendation_templates_status
  ON recommendation_templates (status, crop_type);

CREATE TABLE IF NOT EXISTS spray_compatibility_rules (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  product_a TEXT NOT NULL,
  product_b TEXT NOT NULL,
  compatible BOOLEAN NOT NULL DEFAULT false,
  min_interval_hours INT,
  notes TEXT,
  active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE UNIQUE INDEX IF NOT EXISTS spray_compat_pair_unique
  ON spray_compatibility_rules (lower(product_a), lower(product_b));

CREATE TABLE IF NOT EXISTS resistance_rotation_groups (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  crop_type TEXT NOT NULL,
  mode_of_action TEXT NOT NULL,
  rotation_order INT NOT NULL DEFAULT 1,
  technical_name TEXT NOT NULL,
  notes TEXT,
  active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_resistance_rotation_crop
  ON resistance_rotation_groups (crop_type, mode_of_action, rotation_order);

-- Seed cultivation tasks (phase-1 crops)
INSERT INTO cultivation_task_master (crop_type, task_key, title_en, instructions_en, target_dap_min, target_dap_max, priority)
SELECT * FROM (VALUES
  ('ginger', 'drainage_check', 'Drainage channel cleaning', 'Clear field drains before heavy rain; avoid waterlogging at rhizome level.', 30, 120, 80),
  ('ginger', 'first_weeding', 'First weeding', 'Light weeding between rows; do not disturb rhizome.', 25, 45, 70),
  ('banana', 'fertilizer_earthing', 'Earthing up + fertilizer', 'Earthing up and apply recommended dose per plant.', 60, 90, 75),
  ('cardamom', 'shade_pruning', 'Shade tree pruning', 'Maintain 50–60% shade; prune overhanging branches.', NULL::int, NULL::int, 60)
) AS v(crop_type, task_key, title_en, instructions_en, target_dap_min, target_dap_max, priority)
WHERE NOT EXISTS (SELECT 1 FROM cultivation_task_master LIMIT 1);

INSERT INTO recommendation_templates (crop_type, issue_key, issue_label_en, recommendation_text_en, products, status, approved_by, approved_at)
SELECT * FROM (VALUES
  (
    'ginger',
    'rhizome_rot',
    'Rhizome rot',
    'Improve drainage; drench with recommended fungicide; avoid irrigation for 3 days.',
    '[{"technical":"Validamycin","dosage":"2 ml/L drench"}]'::jsonb,
    'approved',
    'system',
    NOW()
  ),
  (
    'banana',
    'sigatoka',
    'Sigatoka leaf spot',
    'Remove affected leaves; foliar spray with systemic fungicide; repeat after 15 days if needed.',
    '[{"technical":"Mancozeb + systemic","dosage":"As per label"}]'::jsonb,
    'approved',
    'system',
    NOW()
  )
) AS v(crop_type, issue_key, issue_label_en, recommendation_text_en, products, status, approved_by, approved_at)
WHERE NOT EXISTS (SELECT 1 FROM recommendation_templates LIMIT 1);

INSERT INTO spray_compatibility_rules (product_a, product_b, compatible, min_interval_hours, notes)
SELECT * FROM (VALUES
  ('Mancozeb', 'Copper oxychloride', false, 168, 'Do not mix; alternate sprays with 7+ day gap'),
  ('Validamycin', 'Bacillus subtilis', true, 24, 'Compatible in IPM programs')
) AS v(product_a, product_b, compatible, min_interval_hours, notes)
WHERE NOT EXISTS (SELECT 1 FROM spray_compatibility_rules LIMIT 1);

INSERT INTO resistance_rotation_groups (crop_type, mode_of_action, rotation_order, technical_name, notes)
SELECT * FROM (VALUES
  ('ginger', 'QoI', 1, 'Azoxystrobin', 'Rotate after 2 applications'),
  ('ginger', 'QoI', 2, 'Trifloxystrobin', 'Alternate QoI actives'),
  ('ginger', 'DMI', 1, 'Tebuconazole', 'Use in rotation with QoI')
) AS v(crop_type, mode_of_action, rotation_order, technical_name, notes)
WHERE NOT EXISTS (SELECT 1 FROM resistance_rotation_groups LIMIT 1);

ALTER TABLE cultivation_task_master ENABLE ROW LEVEL SECURITY;
ALTER TABLE recommendation_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE spray_compatibility_rules ENABLE ROW LEVEL SECURITY;
ALTER TABLE resistance_rotation_groups ENABLE ROW LEVEL SECURITY;

CREATE POLICY cultivation_task_master_service ON cultivation_task_master FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY recommendation_templates_service ON recommendation_templates FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY spray_compatibility_rules_service ON spray_compatibility_rules FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY resistance_rotation_groups_service ON resistance_rotation_groups FOR ALL USING (true) WITH CHECK (true);
