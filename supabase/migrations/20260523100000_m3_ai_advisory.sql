-- Morbeez M3 — AI advisory, escalations, automation, history

-- ─── AI advisory sessions ────────────────────────────────
CREATE TABLE ai_advisory_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  farmer_id UUID NOT NULL REFERENCES farmers(id) ON DELETE CASCADE,
  channel TEXT NOT NULL DEFAULT 'api' CHECK (channel IN ('api', 'whatsapp', 'web', 'app')),
  crop_type TEXT NOT NULL DEFAULT 'ginger',
  crop_stage TEXT,
  language TEXT NOT NULL DEFAULT 'en' CHECK (language IN ('en', 'ml', 'ta', 'kn', 'hi')),
  status TEXT NOT NULL DEFAULT 'processing' CHECK (
    status IN ('processing', 'completed', 'escalated', 'failed', 'cancelled')
  ),
  symptoms_text TEXT,
  voice_transcript TEXT,
  image_storage_path TEXT,
  plant_id_result JSONB,
  confidence_score DECIMAL(5, 4),
  escalation_recommended BOOLEAN DEFAULT FALSE,
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_ai_sessions_farmer ON ai_advisory_sessions(farmer_id);
CREATE INDEX idx_ai_sessions_status ON ai_advisory_sessions(status);
CREATE INDEX idx_ai_sessions_created ON ai_advisory_sessions(created_at DESC);

-- ─── Structured AI outputs ───────────────────────────────
CREATE TABLE ai_advisory_outputs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id UUID NOT NULL REFERENCES ai_advisory_sessions(id) ON DELETE CASCADE,
  provider TEXT NOT NULL CHECK (provider IN ('openai', 'plantid', 'merged')),
  language TEXT NOT NULL DEFAULT 'en',
  probable_issue TEXT,
  nutrient_deficiency JSONB DEFAULT '[]',
  stress_analysis JSONB DEFAULT '[]',
  treatment_recommendations JSONB DEFAULT '[]',
  dosage_guidance JSONB DEFAULT '[]',
  precautions JSONB DEFAULT '[]',
  farmer_summary_en TEXT,
  farmer_summary_ml TEXT,
  raw_response JSONB NOT NULL DEFAULT '{}',
  model_version TEXT,
  tokens_used INTEGER,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_ai_outputs_session ON ai_advisory_outputs(session_id);

-- ─── Product recommendations ───────────────────────────────
CREATE TABLE ai_product_recommendations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id UUID NOT NULL REFERENCES ai_advisory_sessions(id) ON DELETE CASCADE,
  shopify_product_handle TEXT,
  shopify_variant_id TEXT,
  product_title TEXT NOT NULL,
  reason TEXT,
  dosage_schedule JSONB,
  priority INTEGER DEFAULT 0,
  combo_kit_id TEXT,
  agronomist_approved BOOLEAN,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_ai_recs_session ON ai_product_recommendations(session_id);

-- ─── Agronomist escalations ──────────────────────────────
CREATE TABLE agronomist_escalations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id UUID NOT NULL REFERENCES ai_advisory_sessions(id) ON DELETE CASCADE,
  farmer_id UUID NOT NULL REFERENCES farmers(id) ON DELETE CASCADE,
  reason TEXT NOT NULL,
  confidence_at_escalation DECIMAL(5, 4),
  priority TEXT NOT NULL DEFAULT 'normal' CHECK (priority IN ('low', 'normal', 'high', 'urgent')),
  status TEXT NOT NULL DEFAULT 'pending' CHECK (
    status IN ('pending', 'assigned', 'in_review', 'resolved', 'closed')
  ),
  assigned_to TEXT,
  agronomist_notes TEXT,
  correction JSONB,
  resolution TEXT,
  resolved_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_escalations_status ON agronomist_escalations(status);
CREATE INDEX idx_escalations_farmer ON agronomist_escalations(farmer_id);

-- ─── Telecaller / agronomist notes ─────────────────────────
CREATE TABLE telecaller_notes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  farmer_id UUID NOT NULL REFERENCES farmers(id) ON DELETE CASCADE,
  session_id UUID REFERENCES ai_advisory_sessions(id) ON DELETE SET NULL,
  escalation_id UUID REFERENCES agronomist_escalations(id) ON DELETE SET NULL,
  author TEXT,
  note TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ─── Disease / crop history (analytics-ready) ──────────────
CREATE TABLE disease_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  farmer_id UUID NOT NULL REFERENCES farmers(id) ON DELETE CASCADE,
  session_id UUID REFERENCES ai_advisory_sessions(id) ON DELETE SET NULL,
  crop_type TEXT NOT NULL,
  issue_label TEXT NOT NULL,
  severity TEXT CHECK (severity IN ('low', 'medium', 'high')),
  resolved BOOLEAN DEFAULT FALSE,
  recorded_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_disease_history_farmer ON disease_history(farmer_id);

-- ─── Automation jobs (reminders, follow-ups) ───────────────
CREATE TABLE advisory_automation_jobs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  farmer_id UUID NOT NULL REFERENCES farmers(id) ON DELETE CASCADE,
  session_id UUID REFERENCES ai_advisory_sessions(id) ON DELETE SET NULL,
  job_type TEXT NOT NULL CHECK (
    job_type IN ('follow_up_reminder', 'callback_reminder', 'whatsapp_follow_up', 'seasonal_alert')
  ),
  scheduled_at TIMESTAMPTZ NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'processing', 'completed', 'failed', 'cancelled')),
  payload JSONB DEFAULT '{}',
  attempts INTEGER DEFAULT 0,
  last_error TEXT,
  completed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_automation_pending ON advisory_automation_jobs(scheduled_at)
  WHERE status = 'pending';

-- ─── AI request audit log ──────────────────────────────────
CREATE TABLE ai_request_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id UUID REFERENCES ai_advisory_sessions(id) ON DELETE SET NULL,
  provider TEXT NOT NULL,
  endpoint TEXT,
  latency_ms INTEGER,
  success BOOLEAN NOT NULL,
  error_message TEXT,
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_ai_request_logs_session ON ai_request_logs(session_id);

-- RLS
ALTER TABLE ai_advisory_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE agronomist_escalations ENABLE ROW LEVEL SECURITY;

CREATE POLICY service_role_ai_sessions ON ai_advisory_sessions
  FOR ALL USING (auth.role() = 'service_role');

CREATE POLICY service_role_escalations ON agronomist_escalations
  FOR ALL USING (auth.role() = 'service_role');
