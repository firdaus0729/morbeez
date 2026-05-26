-- WhatsApp + OpenAI pipeline: FAQ cache, per-farmer AI quotas, lead attribution, duplicate images

ALTER TABLE leads
  ADD COLUMN IF NOT EXISTS campaign_source TEXT,
  ADD COLUMN IF NOT EXISTS referral_source TEXT,
  ADD COLUMN IF NOT EXISTS affiliate_source TEXT,
  ADD COLUMN IF NOT EXISTS whatsapp_profile_name TEXT;

CREATE INDEX IF NOT EXISTS idx_leads_campaign ON leads(campaign_source) WHERE campaign_source IS NOT NULL;

-- Daily AI usage per farmer (cost control)
CREATE TABLE IF NOT EXISTS farmer_ai_usage_daily (
  farmer_id UUID NOT NULL REFERENCES farmers(id) ON DELETE CASCADE,
  usage_date DATE NOT NULL DEFAULT CURRENT_DATE,
  text_queries INTEGER NOT NULL DEFAULT 0,
  image_queries INTEGER NOT NULL DEFAULT 0,
  voice_queries INTEGER NOT NULL DEFAULT 0,
  voice_seconds INTEGER NOT NULL DEFAULT 0,
  blocked_requests INTEGER NOT NULL DEFAULT 0,
  last_request_at TIMESTAMPTZ,
  PRIMARY KEY (farmer_id, usage_date)
);

CREATE INDEX IF NOT EXISTS idx_farmer_ai_usage_date ON farmer_ai_usage_daily(usage_date);

-- FAQ / cached agriculture responses (skip OpenAI when matched)
CREATE TABLE IF NOT EXISTS advisory_faq_cache (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  faq_key TEXT NOT NULL UNIQUE,
  keywords TEXT[] NOT NULL DEFAULT '{}',
  response_en TEXT NOT NULL,
  response_ml TEXT,
  response_ta TEXT,
  response_kn TEXT,
  response_hi TEXT,
  hit_count INTEGER NOT NULL DEFAULT 0,
  active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_advisory_faq_active ON advisory_faq_cache(active) WHERE active = TRUE;

-- Recent image hashes per farmer (duplicate upload detection)
CREATE TABLE IF NOT EXISTS farmer_image_hashes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  farmer_id UUID NOT NULL REFERENCES farmers(id) ON DELETE CASCADE,
  content_hash TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_farmer_image_hashes_lookup
  ON farmer_image_hashes(farmer_id, content_hash, created_at DESC);

ALTER TABLE farmer_ai_usage_daily ENABLE ROW LEVEL SECURITY;
ALTER TABLE advisory_faq_cache ENABLE ROW LEVEL SECURITY;
ALTER TABLE farmer_image_hashes ENABLE ROW LEVEL SECURITY;

CREATE POLICY farmer_ai_usage_daily_service ON farmer_ai_usage_daily FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY advisory_faq_cache_service ON advisory_faq_cache FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY farmer_image_hashes_service ON farmer_image_hashes FOR ALL USING (true) WITH CHECK (true);

-- Seed starter FAQs
INSERT INTO advisory_faq_cache (faq_key, keywords, response_en, response_ml) VALUES
  (
    'how_crop_doctor',
    ARRAY['crop doctor', 'how to use', 'photo', 'image', 'ചിത്രം', 'ഫോട്ടോ', 'விவசாய', 'ಬೆಳೆ'],
    'Send a clear photo of your crop problem (leaves, stem, or affected area) in good daylight. Our AI Crop Doctor will analyze it and suggest next steps. For urgent issues, type "call" for a callback.',
    'നിങ്ങളുടെ വിളയിലെ പ്രശ്നത്തിന്റെ വ്യക്തമായ ഫോട്ടോ (ഇല, തണ്ട്) പകൽ നല്ല വെളിച്ചത്തിൽ അയയ്ക്കുക. AI Crop Doctor വിശകലനം ചെയ്ത് നിർദേശം നൽകും. അടിയന്തിരമാണെങ്കിൽ "call" എന്ന് ടൈപ്പ് ചെയ്യുക.'
  ),
  (
    'welcome',
    ARRAY['hi', 'hello', 'start', 'namaste', 'നമസ്കാരം', 'vanakkam'],
    'Welcome to Morbeez! Send a crop photo for AI advisory, or type "quote" for prices, "call" for a callback.',
    'മോർബീസിലേക്ക് സ്വാഗതം! വിള ചിത്രം അയയ്ക്കുക, വിലയ്ക്ക് "quote", കോൾബാക്കിന് "call" ടൈപ്പ് ചെയ്യുക.'
  )
ON CONFLICT (faq_key) DO NOTHING;
