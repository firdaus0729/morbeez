-- FEX v2: experience years, trust stats, local practices library

ALTER TABLE farmers
  ADD COLUMN IF NOT EXISTS crop_experience_years INT;

ALTER TABLE farmer_advisory_feedback
  ADD COLUMN IF NOT EXISTS crop_experience_years INT;

CREATE TABLE IF NOT EXISTS farmer_experience_stats (
  farmer_id UUID PRIMARY KEY REFERENCES farmers(id) ON DELETE CASCADE,
  correct_identifications INT NOT NULL DEFAULT 0,
  total_feedback_submitted INT NOT NULL DEFAULT 0,
  approved_feedback_count INT NOT NULL DEFAULT 0,
  rejected_feedback_count INT NOT NULL DEFAULT 0,
  recommendation_success_rate DECIMAL(5, 4),
  primary_crop_specialization TEXT,
  trust_score DECIMAL(5, 4) NOT NULL DEFAULT 0.5,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS local_practices (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  farmer_id UUID REFERENCES farmers(id) ON DELETE SET NULL,
  feedback_id UUID REFERENCES farmer_advisory_feedback(id) ON DELETE SET NULL,
  session_id UUID REFERENCES ai_advisory_sessions(id) ON DELETE SET NULL,
  crop_type TEXT NOT NULL,
  district TEXT NOT NULL DEFAULT '',
  pincode TEXT,
  village TEXT,
  problem_label TEXT NOT NULL,
  farmer_practice TEXT NOT NULL,
  outcome TEXT,
  agronomist_verified BOOLEAN NOT NULL DEFAULT true,
  verified_by TEXT,
  verified_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  metadata JSONB NOT NULL DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_local_practices_lookup
  ON local_practices (crop_type, district, problem_label);

CREATE INDEX IF NOT EXISTS idx_local_practices_feedback
  ON local_practices (feedback_id);

ALTER TABLE farmer_experience_stats ENABLE ROW LEVEL SECURITY;
ALTER TABLE local_practices ENABLE ROW LEVEL SECURITY;

CREATE POLICY farmer_experience_stats_service ON farmer_experience_stats
  FOR ALL USING (true) WITH CHECK (true);

CREATE POLICY local_practices_service ON local_practices
  FOR ALL USING (true) WITH CHECK (true);
