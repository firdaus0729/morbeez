-- Scenarios 30, 31, 37 — cultivation activity logging + follow-up prompts

CREATE TABLE IF NOT EXISTS cultivation_activities (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  farmer_id UUID NOT NULL REFERENCES farmers(id) ON DELETE CASCADE,
  farmer_crop_id UUID REFERENCES farmer_crops(id) ON DELETE SET NULL,
  farm_block_id UUID REFERENCES farm_blocks(id) ON DELETE SET NULL,
  advisory_session_id UUID REFERENCES ai_advisory_sessions(id) ON DELETE SET NULL,
  commerce_order_id UUID REFERENCES commerce_orders(id) ON DELETE SET NULL,
  activity_type TEXT NOT NULL DEFAULT 'spray_applied' CHECK (
    activity_type IN ('spray_applied', 'fertigation', 'drench', 'scouting', 'other')
  ),
  applied_at DATE NOT NULL DEFAULT CURRENT_DATE,
  crop_type TEXT,
  crop_stage TEXT,
  dosage_notes TEXT,
  products JSONB DEFAULT '[]',
  source TEXT NOT NULL DEFAULT 'whatsapp' CHECK (source IN ('whatsapp', 'admin', 'telecaller', 'system')),
  notes TEXT,
  outcome TEXT CHECK (outcome IN ('better', 'partial', 'no_improvement', 'unknown')),
  outcome_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_cultivation_activities_farmer
  ON cultivation_activities (farmer_id, applied_at DESC);

CREATE INDEX IF NOT EXISTS idx_cultivation_activities_session
  ON cultivation_activities (advisory_session_id);

-- Extend automation job types for cultivation follow-ups
ALTER TABLE advisory_automation_jobs DROP CONSTRAINT IF EXISTS advisory_automation_jobs_job_type_check;

ALTER TABLE advisory_automation_jobs ADD CONSTRAINT advisory_automation_jobs_job_type_check
  CHECK (
    job_type IN (
      'follow_up_reminder',
      'callback_reminder',
      'whatsapp_follow_up',
      'seasonal_alert',
      'cultivation_application_prompt',
      'cultivation_result_validation'
    )
  );

ALTER TABLE cultivation_activities ENABLE ROW LEVEL SECURITY;
CREATE POLICY cultivation_activities_service ON cultivation_activities FOR ALL USING (true) WITH CHECK (true);
