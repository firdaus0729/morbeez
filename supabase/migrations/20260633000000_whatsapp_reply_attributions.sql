-- Track which Morbeez knowledge module powered each WhatsApp reply (USP analytics).

CREATE TABLE IF NOT EXISTS whatsapp_reply_attributions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  farmer_id UUID NOT NULL REFERENCES farmers(id) ON DELETE CASCADE,
  channel TEXT NOT NULL DEFAULT 'whatsapp',
  module_source TEXT NOT NULL,
  crop_type TEXT,
  district TEXT,
  reuse_case_id UUID,
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_whatsapp_reply_attr_farmer
  ON whatsapp_reply_attributions (farmer_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_whatsapp_reply_attr_module
  ON whatsapp_reply_attributions (module_source, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_whatsapp_reply_attr_created
  ON whatsapp_reply_attributions (created_at DESC);

ALTER TABLE whatsapp_reply_attributions ENABLE ROW LEVEL SECURITY;

CREATE POLICY whatsapp_reply_attributions_service ON whatsapp_reply_attributions
  FOR ALL USING (true) WITH CHECK (true);

COMMENT ON TABLE whatsapp_reply_attributions IS
  'Per-outbound WhatsApp reply: which Morbeez module (reuse, compatibility, etc.) vs generic OpenAI';
