-- WhatsApp OS: conversation state, terminology, and retention controls

-- ─── Conversation sessions (per farmer) ───────────────────────────────
CREATE TABLE IF NOT EXISTS conversation_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  farmer_id UUID NOT NULL REFERENCES farmers(id) ON DELETE CASCADE,
  channel TEXT NOT NULL DEFAULT 'whatsapp',
  state TEXT NOT NULL DEFAULT 'language_select',
  preferred_language TEXT,
  conversation_owner TEXT NOT NULL DEFAULT 'ai' CHECK (conversation_owner IN ('ai', 'telecaller', 'agronomist')),
  active_plot_id UUID,
  last_menu_at TIMESTAMPTZ,
  last_ai_at TIMESTAMPTZ,
  ai_paused BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (farmer_id, channel)
);

CREATE INDEX IF NOT EXISTS idx_conversation_sessions_farmer ON conversation_sessions(farmer_id);
CREATE INDEX IF NOT EXISTS idx_conversation_sessions_state ON conversation_sessions(state, updated_at DESC);

-- ─── Terminology dictionary (regional slang learning) ──────────────────
CREATE TABLE IF NOT EXISTS agronomy_terms (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  term TEXT NOT NULL,
  language TEXT NOT NULL DEFAULT 'en',
  meaning TEXT NOT NULL,
  crop_type TEXT,
  district TEXT,
  confidence REAL NOT NULL DEFAULT 0.7,
  examples TEXT[] NOT NULL DEFAULT '{}',
  created_by TEXT NOT NULL DEFAULT 'system' CHECK (created_by IN ('system', 'telecaller', 'agronomist', 'admin')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (term, language, crop_type, district)
);

CREATE INDEX IF NOT EXISTS idx_agronomy_terms_lookup
  ON agronomy_terms(language, term, crop_type, district);

-- Review tasks created by unknown-terminology detection
CREATE TABLE IF NOT EXISTS terminology_review_tasks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  farmer_id UUID REFERENCES farmers(id) ON DELETE SET NULL,
  term TEXT NOT NULL,
  language TEXT,
  crop_type TEXT,
  district TEXT,
  context_text TEXT,
  status TEXT NOT NULL DEFAULT 'open' CHECK (status IN ('open', 'in_review', 'resolved', 'dismissed')),
  assigned_to TEXT,
  resolution_meaning TEXT,
  resolved_by TEXT,
  resolved_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_terminology_review_status
  ON terminology_review_tasks(status, created_at DESC);

-- ─── Retention metadata for raw payloads/media (3 days) ───────────────
-- We keep interaction_logs and webhook_logs but can redact/purge payload bodies after retention window.
ALTER TABLE webhook_logs
  ADD COLUMN IF NOT EXISTS purge_after TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS payload_redacted BOOLEAN NOT NULL DEFAULT false;

ALTER TABLE interaction_logs
  ADD COLUMN IF NOT EXISTS purge_after TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS payload_redacted BOOLEAN NOT NULL DEFAULT false;

-- Default purge_after = created_at + 3 days for newly inserted rows (application should set explicitly too)
-- NOTE: we avoid triggers for portability; cleanup worker will enforce.

-- RLS (service role)
ALTER TABLE conversation_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE agronomy_terms ENABLE ROW LEVEL SECURITY;
ALTER TABLE terminology_review_tasks ENABLE ROW LEVEL SECURITY;

CREATE POLICY conversation_sessions_service ON conversation_sessions FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY agronomy_terms_service ON agronomy_terms FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY terminology_review_tasks_service ON terminology_review_tasks FOR ALL USING (true) WITH CHECK (true);

