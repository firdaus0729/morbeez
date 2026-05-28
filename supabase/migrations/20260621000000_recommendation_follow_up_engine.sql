-- Auto follow-up & recommendation tracking engine

ALTER TABLE recommendation_records
  ADD COLUMN IF NOT EXISTS application_status TEXT DEFAULT 'pending_application'
    CHECK (
      application_status IN (
        'pending_application',
        'applied',
        'not_applied',
        'need_clarification',
        'unknown'
      )
    ),
  ADD COLUMN IF NOT EXISTS applied_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS severity TEXT CHECK (severity IN ('low', 'medium', 'high')),
  ADD COLUMN IF NOT EXISTS technical_name TEXT,
  ADD COLUMN IF NOT EXISTS trade_name TEXT;

COMMENT ON COLUMN recommendation_records.application_status IS 'Compliance: pending_application until farmer confirms';

CREATE TABLE IF NOT EXISTS recommendation_follow_ups (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  recommendation_record_id UUID NOT NULL REFERENCES recommendation_records(id) ON DELETE CASCADE,
  farmer_id UUID NOT NULL REFERENCES farmers(id) ON DELETE CASCADE,
  block_id UUID REFERENCES farm_blocks(id) ON DELETE SET NULL,
  phase TEXT NOT NULL CHECK (phase IN ('application_check', 'application_reminder', 'outcome_check')),
  status TEXT NOT NULL DEFAULT 'scheduled' CHECK (
    status IN ('scheduled', 'sent', 'responded', 'completed', 'cancelled', 'escalated')
  ),
  scheduled_at TIMESTAMPTZ NOT NULL,
  sent_at TIMESTAMPTZ,
  responded_at TIMESTAMPTZ,
  farmer_response TEXT CHECK (
    farmer_response IN (
      'yes_applied',
      'not_yet',
      'need_clarification',
      'improved',
      'no_improvement',
      'worsened',
      'partial'
    )
  ),
  reminder_count INT NOT NULL DEFAULT 0,
  metadata JSONB NOT NULL DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_rec_follow_ups_scheduled
  ON recommendation_follow_ups (status, scheduled_at)
  WHERE status = 'scheduled';

CREATE INDEX IF NOT EXISTS idx_rec_follow_ups_rec
  ON recommendation_follow_ups (recommendation_record_id, phase);

CREATE TABLE IF NOT EXISTS recommendation_applications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  recommendation_record_id UUID NOT NULL UNIQUE REFERENCES recommendation_records(id) ON DELETE CASCADE,
  farmer_id UUID NOT NULL REFERENCES farmers(id) ON DELETE CASCADE,
  block_id UUID REFERENCES farm_blocks(id) ON DELETE SET NULL,
  technical_name TEXT,
  trade_name TEXT,
  dosage TEXT,
  application_method TEXT,
  applied_at DATE NOT NULL,
  follow_up_date DATE,
  result_status TEXT NOT NULL DEFAULT 'pending' CHECK (
    result_status IN ('pending', 'improved', 'partial', 'no_improvement', 'worsened')
  ),
  applied_by TEXT NOT NULL DEFAULT 'farmer',
  weather_condition TEXT,
  notes TEXT,
  cultivation_activity_id UUID REFERENCES cultivation_activities(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_rec_applications_farmer
  ON recommendation_applications (farmer_id, applied_at DESC);

CREATE TABLE IF NOT EXISTS ai_learning_samples (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  recommendation_record_id UUID REFERENCES recommendation_records(id) ON DELETE SET NULL,
  farmer_id UUID NOT NULL REFERENCES farmers(id) ON DELETE CASCADE,
  ai_session_id UUID REFERENCES ai_advisory_sessions(id) ON DELETE SET NULL,
  crop_type TEXT,
  disease_label TEXT,
  dap INT,
  severity TEXT,
  weather_context JSONB NOT NULL DEFAULT '{}',
  recommendation_snapshot JSONB NOT NULL DEFAULT '{}',
  application_confirmed BOOLEAN,
  outcome TEXT,
  escalated BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_ai_learning_samples_crop
  ON ai_learning_samples (crop_type, disease_label, created_at DESC);

-- Extend automation job types
ALTER TABLE advisory_automation_jobs DROP CONSTRAINT IF EXISTS advisory_automation_jobs_job_type_check;

ALTER TABLE advisory_automation_jobs ADD CONSTRAINT advisory_automation_jobs_job_type_check
  CHECK (
    job_type IN (
      'follow_up_reminder',
      'callback_reminder',
      'whatsapp_follow_up',
      'seasonal_alert',
      'cultivation_application_prompt',
      'cultivation_result_validation',
      'rec_application_check',
      'rec_application_reminder',
      'rec_outcome_check',
      'rec_no_response_escalation'
    )
  );

ALTER TABLE recommendation_follow_ups ENABLE ROW LEVEL SECURITY;
ALTER TABLE recommendation_applications ENABLE ROW LEVEL SECURITY;
ALTER TABLE ai_learning_samples ENABLE ROW LEVEL SECURITY;

CREATE POLICY rec_follow_ups_service ON recommendation_follow_ups FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY rec_applications_service ON recommendation_applications FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY ai_learning_samples_service ON ai_learning_samples FOR ALL USING (true) WITH CHECK (true);
