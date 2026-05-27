-- Phase 2.3 — Quick replies, language templates (Operations Center)

CREATE TABLE IF NOT EXISTS whatsapp_quick_replies (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  shortcut_key TEXT NOT NULL,
  category TEXT NOT NULL DEFAULT 'general' CHECK (
    category IN ('general', 'telecaller', 'advisory', 'orders', 'broadcast')
  ),
  label_en TEXT NOT NULL,
  body_en TEXT NOT NULL,
  body_ml TEXT,
  body_ta TEXT,
  body_kn TEXT,
  body_hi TEXT,
  active BOOLEAN NOT NULL DEFAULT true,
  sort_order INT NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT whatsapp_quick_replies_key_unique UNIQUE (shortcut_key)
);

CREATE INDEX IF NOT EXISTS idx_whatsapp_quick_replies_active
  ON whatsapp_quick_replies (category, sort_order)
  WHERE active = true;

CREATE TABLE IF NOT EXISTS whatsapp_language_templates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  template_key TEXT NOT NULL,
  language TEXT NOT NULL CHECK (language IN ('en', 'ml', 'ta', 'kn', 'hi')),
  channel TEXT NOT NULL DEFAULT 'session' CHECK (channel IN ('session', 'meta_template')),
  body_text TEXT NOT NULL,
  header_text TEXT,
  footer_text TEXT,
  meta_template_name TEXT,
  variable_hints JSONB NOT NULL DEFAULT '[]',
  status TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'approved', 'archived')),
  active BOOLEAN NOT NULL DEFAULT true,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT whatsapp_language_templates_key_lang UNIQUE (template_key, language)
);

CREATE INDEX IF NOT EXISTS idx_whatsapp_language_templates_lookup
  ON whatsapp_language_templates (template_key, language, status)
  WHERE active = true;

INSERT INTO whatsapp_quick_replies (shortcut_key, category, label_en, body_en, body_ml, sort_order)
SELECT * FROM (VALUES
  ('greet', 'general', 'Greeting', 'Namaskaram! Morbeez Krishi Sahayam here. How can we help your crop today?', 'നമസ്കാരം! മോർബീസ് കൃഷി സഹായം. ഇന്ന് എന്ത് സഹായം വേണം?', 10),
  ('ask_photo', 'advisory', 'Ask for photo', 'Please send a clear photo of the affected leaves or rhizome in good light.', 'ബാധിത ഇലയുടെ അല്ലെങ്കിൽ റൈസോമിന്റെ ചിത്രം അയയ്ക്കൂ.', 20),
  ('follow_up', 'telecaller', 'Follow-up', 'We will call you tomorrow to check progress. Thank you!', 'നാളെ വിളിച്ച് നില പരിശോധിക്കാം. നന്ദി!', 30),
  ('price_info', 'orders', 'Price enquiry', 'Please share your crop and quantity — we will send today''s best offer.', 'വിളയും അളവും പറയൂ — ഇന്നത്തെ ഓഫർ അയയ്ക്കാം.', 40)
) AS v(shortcut_key, category, label_en, body_en, body_ml, sort_order)
WHERE NOT EXISTS (SELECT 1 FROM whatsapp_quick_replies LIMIT 1);

INSERT INTO whatsapp_language_templates (template_key, language, channel, body_text, meta_template_name, status)
SELECT * FROM (VALUES
  ('welcome_farmer', 'en', 'meta_template', 'Welcome to Morbeez! Reply with your crop problem or send a photo.', 'welcome_farmer', 'approved'),
  ('welcome_farmer', 'ml', 'meta_template', 'മോർബീസിലേക്ക് സ്വാഗതം! വിളയുടെ പ്രശ്നം അല്ലെങ്കിൽ ചിത്രം അയയ്ക്കൂ.', 'welcome_farmer', 'approved'),
  ('session_follow_up', 'en', 'session', 'Hi {{name}}, following up on your advisory. Did the spray help?', NULL, 'approved'),
  ('session_follow_up', 'ml', 'session', 'നമസ്കാരം {{name}}, ഉപദേശം പ്രയോജനപ്പെട്ടോ?', NULL, 'approved')
) AS v(template_key, language, channel, body_text, meta_template_name, status)
WHERE NOT EXISTS (SELECT 1 FROM whatsapp_language_templates LIMIT 1);

ALTER TABLE whatsapp_quick_replies ENABLE ROW LEVEL SECURITY;
ALTER TABLE whatsapp_language_templates ENABLE ROW LEVEL SECURITY;

CREATE POLICY whatsapp_quick_replies_service ON whatsapp_quick_replies FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY whatsapp_language_templates_service ON whatsapp_language_templates FOR ALL USING (true) WITH CHECK (true);
