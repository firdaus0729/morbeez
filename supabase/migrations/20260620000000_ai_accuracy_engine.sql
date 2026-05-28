-- AI accuracy engine telemetry + outcomes

CREATE TABLE IF NOT EXISTS ai_accuracy_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id UUID REFERENCES ai_advisory_sessions(id) ON DELETE SET NULL,
  farmer_id UUID NOT NULL REFERENCES farmers(id) ON DELETE CASCADE,
  event_type TEXT NOT NULL DEFAULT 'diagnosis'
    CHECK (event_type IN ('diagnosis', 'validation', 'escalation', 'follow_up')),
  crop_type TEXT,
  confidence DECIMAL(5, 4),
  escalated BOOLEAN DEFAULT FALSE,
  weather_risk TEXT CHECK (weather_risk IN ('low', 'moderate', 'high')),
  source TEXT DEFAULT 'whatsapp',
  metadata JSONB NOT NULL DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_ai_accuracy_events_farmer ON ai_accuracy_events (farmer_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_ai_accuracy_events_session ON ai_accuracy_events (session_id);

CREATE TABLE IF NOT EXISTS ai_case_outcomes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  farmer_id UUID NOT NULL REFERENCES farmers(id) ON DELETE CASCADE,
  session_id UUID REFERENCES ai_advisory_sessions(id) ON DELETE SET NULL,
  outcome TEXT NOT NULL CHECK (outcome IN ('improved', 'partial', 'no_improvement', 'worsened')),
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_ai_case_outcomes_farmer ON ai_case_outcomes (farmer_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_ai_case_outcomes_session ON ai_case_outcomes (session_id);

ALTER TABLE ai_accuracy_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE ai_case_outcomes ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'ai_accuracy_events' AND policyname = 'service_role_ai_accuracy_events'
  ) THEN
    CREATE POLICY service_role_ai_accuracy_events ON ai_accuracy_events FOR ALL USING (auth.role() = 'service_role');
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'ai_case_outcomes' AND policyname = 'service_role_ai_case_outcomes'
  ) THEN
    CREATE POLICY service_role_ai_case_outcomes ON ai_case_outcomes FOR ALL USING (auth.role() = 'service_role');
  END IF;
END $$;

