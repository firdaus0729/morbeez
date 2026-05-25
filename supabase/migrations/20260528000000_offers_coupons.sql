-- Morbeez admin: promotional offers & coupon codes

CREATE TABLE IF NOT EXISTS commerce_offers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  offer_type TEXT NOT NULL CHECK (offer_type IN ('percentage', 'combo', 'flat')),
  discount_label TEXT NOT NULL,
  min_order_amount DECIMAL(12, 2) NOT NULL DEFAULT 0,
  starts_at TIMESTAMPTZ NOT NULL,
  ends_at TIMESTAMPTZ NOT NULL,
  description TEXT,
  active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS commerce_coupons (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  code TEXT NOT NULL UNIQUE,
  discount_label TEXT NOT NULL,
  min_order_amount DECIMAL(12, 2) NOT NULL DEFAULT 0,
  usage_count INTEGER NOT NULL DEFAULT 0,
  usage_limit INTEGER NOT NULL DEFAULT 500,
  valid_until TIMESTAMPTZ NOT NULL,
  active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_commerce_offers_dates ON commerce_offers (starts_at, ends_at);
CREATE INDEX IF NOT EXISTS idx_commerce_coupons_code ON commerce_coupons (code);

ALTER TABLE commerce_offers ENABLE ROW LEVEL SECURITY;
ALTER TABLE commerce_coupons ENABLE ROW LEVEL SECURITY;

CREATE POLICY commerce_offers_service_role ON commerce_offers FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY commerce_coupons_service_role ON commerce_coupons FOR ALL USING (true) WITH CHECK (true);

-- Demo rows (safe to re-run: only when tables are empty)
INSERT INTO commerce_offers (name, offer_type, discount_label, min_order_amount, starts_at, ends_at, description)
SELECT * FROM (VALUES
  ('Summer Special Offer', 'percentage', '10%', 999, '2026-05-01T00:00:00Z'::timestamptz, '2026-08-31T23:59:59Z'::timestamptz, 'Seasonal discount on selected products'),
  ('Buy 2 Get 1', 'combo', 'Buy 2 Get 1', 1499, '2026-05-01T00:00:00Z'::timestamptz, '2026-12-31T23:59:59Z'::timestamptz, 'Combo bundle offer'),
  ('First Order Offer', 'flat', '₹100 OFF', 499, '2026-06-01T00:00:00Z'::timestamptz, '2026-12-31T23:59:59Z'::timestamptz, 'New farmer welcome discount'),
  ('Monsoon Prep Sale', 'percentage', '15%', 1999, '2026-03-01T00:00:00Z'::timestamptz, '2026-04-30T23:59:59Z'::timestamptz, 'Expired monsoon campaign')
) AS v(name, offer_type, discount_label, min_order_amount, starts_at, ends_at, description)
WHERE NOT EXISTS (SELECT 1 FROM commerce_offers LIMIT 1);

INSERT INTO commerce_coupons (code, discount_label, min_order_amount, usage_count, usage_limit, valid_until)
SELECT * FROM (VALUES
  ('MOR10', '10% OFF', 999, 125, 500, '2026-08-31T23:59:59Z'::timestamptz),
  ('FARMER50', '₹50 OFF', 499, 89, 1000, '2026-08-31T23:59:59Z'::timestamptz),
  ('KHARIF25', '25% OFF', 2499, 12, 200, '2026-06-30T23:59:59Z'::timestamptz)
) AS v(code, discount_label, min_order_amount, usage_count, usage_limit, valid_until)
WHERE NOT EXISTS (SELECT 1 FROM commerce_coupons LIMIT 1);
