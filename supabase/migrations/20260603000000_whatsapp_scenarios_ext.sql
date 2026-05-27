-- WhatsApp scenarios 2+: session context, admin prices, pack sizes

ALTER TABLE conversation_sessions
  ADD COLUMN IF NOT EXISTS context JSONB NOT NULL DEFAULT '{}';

-- Admin-managed daily crop prices (Scenario 27–28)
CREATE TABLE IF NOT EXISTS crop_daily_prices (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  crop_type TEXT NOT NULL,
  market_name TEXT NOT NULL,
  district TEXT,
  price_per_kg DECIMAL(10, 2) NOT NULL,
  last_year_price_per_kg DECIMAL(10, 2),
  currency TEXT NOT NULL DEFAULT 'INR',
  price_date DATE NOT NULL DEFAULT CURRENT_DATE,
  active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (crop_type, market_name, price_date)
);

CREATE INDEX IF NOT EXISTS idx_crop_daily_prices_lookup
  ON crop_daily_prices(crop_type, price_date DESC, active);

-- Internal pack-size table for quantity optimization (Scenario 4)
CREATE TABLE IF NOT EXISTS product_pack_sizes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  product_key TEXT NOT NULL,
  pack_kg DECIMAL(10, 3) NOT NULL,
  sort_order INT NOT NULL DEFAULT 0,
  active BOOLEAN NOT NULL DEFAULT true,
  UNIQUE (product_key, pack_kg)
);

-- Seed ginger prices (edit via admin / Supabase)
INSERT INTO crop_daily_prices (crop_type, market_name, district, price_per_kg, last_year_price_per_kg, price_date)
VALUES
  ('ginger', 'Wayanad', 'Wayanad', 84.00, 72.00, CURRENT_DATE),
  ('ginger', 'Kochi', 'Ernakulam', 81.00, 70.00, CURRENT_DATE),
  ('ginger', 'Bangalore', 'Bengaluru Urban', 87.00, 74.00, CURRENT_DATE)
ON CONFLICT (crop_type, market_name, price_date) DO UPDATE SET
  price_per_kg = EXCLUDED.price_per_kg,
  last_year_price_per_kg = EXCLUDED.last_year_price_per_kg,
  updated_at = NOW();

INSERT INTO product_pack_sizes (product_key, pack_kg, sort_order)
VALUES
  ('mancozeb', 1.000, 1),
  ('dimethomorph', 1.000, 1),
  ('generic', 0.500, 1),
  ('generic', 1.000, 2),
  ('generic', 5.000, 3)
ON CONFLICT (product_key, pack_kg) DO NOTHING;

ALTER TABLE crop_daily_prices ENABLE ROW LEVEL SECURITY;
ALTER TABLE product_pack_sizes ENABLE ROW LEVEL SECURITY;
CREATE POLICY crop_daily_prices_service ON crop_daily_prices FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY product_pack_sizes_service ON product_pack_sizes FOR ALL USING (true) WITH CHECK (true);
