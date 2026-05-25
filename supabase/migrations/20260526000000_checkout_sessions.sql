-- Razorpay checkout sessions (storefront checkout → Shopify order on payment)

CREATE TABLE IF NOT EXISTS checkout_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  razorpay_order_id TEXT UNIQUE,
  receipt TEXT NOT NULL,
  amount_paise INTEGER NOT NULL,
  currency TEXT NOT NULL DEFAULT 'INR',
  line_items JSONB NOT NULL DEFAULT '[]',
  customer JSONB NOT NULL DEFAULT '{}',
  shipping JSONB NOT NULL DEFAULT '{}',
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'paid', 'failed', 'expired')),
  razorpay_payment_id TEXT,
  shopify_order_id TEXT,
  shopify_order_name TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_checkout_sessions_razorpay_order ON checkout_sessions (razorpay_order_id);
CREATE INDEX IF NOT EXISTS idx_checkout_sessions_status ON checkout_sessions (status);

ALTER TABLE checkout_sessions ENABLE ROW LEVEL SECURITY;
CREATE POLICY checkout_sessions_service_role ON checkout_sessions FOR ALL USING (true) WITH CHECK (true);
