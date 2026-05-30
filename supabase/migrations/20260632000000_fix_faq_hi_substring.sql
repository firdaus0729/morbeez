-- Prevent FAQ welcome from matching "this", "machine", etc. via substring "hi"
UPDATE advisory_faq_cache
SET
  keywords = ARRAY['hello', 'hey', 'start', 'namaste', 'നമസ്കാരം', 'vanakkam', 'hii', 'hlo'],
  updated_at = NOW()
WHERE faq_key = 'welcome';

COMMENT ON TABLE advisory_faq_cache IS 'Keyword match uses word boundaries for short tokens (see faq-cache.service.ts)';
