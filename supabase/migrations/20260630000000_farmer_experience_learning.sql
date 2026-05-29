-- Farmer Experience Learning (FEX): farmer disagreement → agronomist validation → verified reuse

CREATE TABLE IF NOT EXISTS farmer_advisory_feedback (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  farmer_id UUID NOT NULL REFERENCES farmers(id) ON DELETE CASCADE,
  session_id UUID REFERENCES ai_advisory_sessions(id) ON DELETE SET NULL,
  block_id UUID REFERENCES farm_blocks(id) ON DELETE SET NULL,
  ai_probable_issue TEXT,
  ai_confidence DECIMAL(5, 4),
  farmer_suggested_diagnosis TEXT,
  farmer_prior_experience TEXT,
  farmer_prior_product TEXT,
  farmer_prior_outcome TEXT,
  status TEXT NOT NULL DEFAULT 'pending_capture'
    CHECK (status IN ('pending_capture', 'pending_review', 'approved', 'rejected', 'partial')),
  capture_step TEXT,
  agronomist_final_diagnosis TEXT,
  agronomist_notes TEXT,
  reviewed_by TEXT,
  reviewed_at TIMESTAMPTZ,
  escalation_id UUID REFERENCES agronomist_escalations(id) ON DELETE SET NULL,
  confidence_adjustment DECIMAL(5, 4),
  metadata JSONB NOT NULL DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_farmer_advisory_feedback_status
  ON farmer_advisory_feedback (status, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_farmer_advisory_feedback_farmer
  ON farmer_advisory_feedback (farmer_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_farmer_advisory_feedback_session
  ON farmer_advisory_feedback (session_id);

ALTER TABLE farmer_advisory_feedback ENABLE ROW LEVEL SECURITY;

CREATE POLICY farmer_advisory_feedback_service ON farmer_advisory_feedback
  FOR ALL USING (true) WITH CHECK (true);

COMMENT ON TABLE farmer_advisory_feedback IS
  'Farmer corrections to AI diagnosis; agronomist must approve before promoting to advisory_reuse_cases';
