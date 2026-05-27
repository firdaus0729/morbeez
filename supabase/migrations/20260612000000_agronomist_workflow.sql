-- Phase 5: link field findings to canonical recommendation workflow

ALTER TABLE recommendation_records
  ADD COLUMN IF NOT EXISTS field_finding_id UUID REFERENCES crm_field_findings(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_recommendation_records_field_finding
  ON recommendation_records (field_finding_id)
  WHERE field_finding_id IS NOT NULL;
