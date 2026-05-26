-- Field visit findings (agronomist observations)

CREATE TABLE IF NOT EXISTS crm_field_findings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  farmer_id UUID NOT NULL REFERENCES farmers(id) ON DELETE CASCADE,
  lead_id UUID REFERENCES leads(id) ON DELETE SET NULL,
  block_name TEXT NOT NULL DEFAULT 'Block A',
  crop_type TEXT NOT NULL,
  agronomist_name TEXT NOT NULL,
  agronomist_role TEXT DEFAULT 'Field Agronomist',
  observations TEXT,
  parameters JSONB DEFAULT '[]',
  disease_pest TEXT,
  disease_tone TEXT DEFAULT 'healthy' CHECK (disease_tone IN ('healthy', 'warning', 'danger')),
  action_taken TEXT,
  follow_up_at TIMESTAMPTZ,
  photo_urls JSONB DEFAULT '[]',
  visited_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_field_findings_farmer ON crm_field_findings(farmer_id, visited_at DESC);

ALTER TABLE crm_field_findings ENABLE ROW LEVEL SECURITY;
CREATE POLICY crm_field_findings_service ON crm_field_findings FOR ALL USING (true) WITH CHECK (true);
