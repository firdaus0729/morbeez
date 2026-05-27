-- Scenarios 38 (AI reuse), 41 (CRM internal notes), 42 (cultivation knowledge broadcasts)

-- ─── Scenario 38: reusable advisory cases ─────────────────
CREATE TABLE IF NOT EXISTS advisory_reuse_cases (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  crop_type TEXT NOT NULL,
  district TEXT NOT NULL DEFAULT '',
  dap_bucket INT NOT NULL DEFAULT 0,
  symptom_key TEXT NOT NULL,
  issue_label TEXT NOT NULL,
  source_session_id UUID NOT NULL REFERENCES ai_advisory_sessions(id) ON DELETE CASCADE,
  source_farmer_id UUID REFERENCES farmers(id) ON DELETE SET NULL,
  advisory_snapshot JSONB NOT NULL,
  product_snapshot JSONB NOT NULL DEFAULT '[]',
  confidence_score DECIMAL(5, 4),
  outcome_ok BOOLEAN NOT NULL DEFAULT true,
  hit_count INT NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  last_reused_at TIMESTAMPTZ
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_advisory_reuse_unique
  ON advisory_reuse_cases (crop_type, district, dap_bucket, symptom_key);

CREATE INDEX IF NOT EXISTS idx_advisory_reuse_lookup
  ON advisory_reuse_cases (crop_type, district, dap_bucket, outcome_ok);

-- ─── Scenario 41: internal CRM notes (staff-only) ─────────
CREATE TABLE IF NOT EXISTS crm_internal_notes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  farmer_id UUID NOT NULL REFERENCES farmers(id) ON DELETE CASCADE,
  author TEXT,
  category TEXT NOT NULL DEFAULT 'general',
  body TEXT NOT NULL,
  pinned BOOLEAN NOT NULL DEFAULT false,
  archived_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_crm_internal_notes_farmer
  ON crm_internal_notes (farmer_id, pinned DESC, created_at DESC)
  WHERE archived_at IS NULL;

-- ─── Scenario 42: extend broadcast kinds ──────────────────
ALTER TABLE crop_dap_broadcast_rules
  DROP CONSTRAINT IF EXISTS crop_dap_broadcast_rules_broadcast_kind_check;

ALTER TABLE crop_dap_broadcast_rules
  ADD CONSTRAINT crop_dap_broadcast_rules_broadcast_kind_check
  CHECK (
    broadcast_kind IN (
      'cultivation_schedule',
      'fertigation_reminder',
      'pgr_broadcast',
      'dap_task',
      'cultivation_knowledge'
    )
  );

-- Cardamom vegetative flush knowledge (Scenario 42 example)
INSERT INTO crop_dap_broadcast_rules (
  crop_type, broadcast_kind, target_dap, dap_tolerance, priority, active
)
SELECT 'cardamom', 'cultivation_knowledge', 78, 8, 58, true
WHERE NOT EXISTS (
  SELECT 1 FROM crop_dap_broadcast_rules
  WHERE broadcast_kind = 'cultivation_knowledge' AND crop_type = 'cardamom'
);

INSERT INTO crop_dap_broadcast_rules (
  crop_type, broadcast_kind, target_dap, dap_tolerance, priority, active
)
SELECT 'ginger', 'cultivation_knowledge', 45, 7, 52, true
WHERE NOT EXISTS (
  SELECT 1 FROM crop_dap_broadcast_rules
  WHERE broadcast_kind = 'cultivation_knowledge' AND crop_type = 'ginger'
);

ALTER TABLE advisory_reuse_cases ENABLE ROW LEVEL SECURITY;
ALTER TABLE crm_internal_notes ENABLE ROW LEVEL SECURITY;
CREATE POLICY advisory_reuse_cases_service ON advisory_reuse_cases FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY crm_internal_notes_service ON crm_internal_notes FOR ALL USING (true) WITH CHECK (true);
