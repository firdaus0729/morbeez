-- Morbeez M2 — Farmer profiles, CRM, commerce sync, webhooks, event outbox

-- Supabase: use pgcrypto (uuid-ossp lives in extensions schema and breaks uuid_generate_v4 in public)
CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- ─── Farmers ───────────────────────────────────────────────
CREATE TABLE farmers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  phone TEXT NOT NULL UNIQUE,
  name TEXT,
  preferred_language TEXT NOT NULL DEFAULT 'en',
  district TEXT,
  state TEXT,
  village TEXT,
  shopify_customer_id TEXT UNIQUE,
  source TEXT DEFAULT 'api',
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_farmers_shopify ON farmers(shopify_customer_id);
CREATE INDEX idx_farmers_district ON farmers(district);

CREATE TABLE farmer_crops (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  farmer_id UUID NOT NULL REFERENCES farmers(id) ON DELETE CASCADE,
  crop_type TEXT NOT NULL,
  acreage DECIMAL(10, 2),
  stage TEXT,
  is_primary BOOLEAN DEFAULT FALSE,
  season TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_farmer_crops_farmer ON farmer_crops(farmer_id);

-- Future M3: disease_history, yield_history, ai_logs (commented placeholders)
-- CREATE TABLE disease_history (...);
-- CREATE TABLE yield_history (...);
-- CREATE TABLE ai_advisory_logs (...);

-- ─── CRM ─────────────────────────────────────────────────
CREATE TABLE leads (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  farmer_id UUID REFERENCES farmers(id) ON DELETE SET NULL,
  intent TEXT NOT NULL CHECK (intent IN ('quotation', 'callback', 'support', 'dealer', 'general')),
  source TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'new' CHECK (status IN ('new', 'contacted', 'qualified', 'won', 'lost')),
  priority TEXT DEFAULT 'normal' CHECK (priority IN ('low', 'normal', 'high', 'urgent')),
  assigned_to TEXT,
  notes TEXT,
  follow_up_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_leads_status ON leads(status);
CREATE INDEX idx_leads_farmer ON leads(farmer_id);

CREATE TABLE quotation_inquiries (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  farmer_id UUID REFERENCES farmers(id) ON DELETE SET NULL,
  lead_id UUID REFERENCES leads(id) ON DELETE SET NULL,
  shopify_draft_order_id TEXT,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'quoted', 'accepted', 'rejected', 'expired')),
  line_items JSONB DEFAULT '[]',
  total_estimate DECIMAL(12, 2),
  request_notes TEXT,
  razorpay_payment_link_id TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE callback_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  farmer_id UUID REFERENCES farmers(id) ON DELETE SET NULL,
  lead_id UUID REFERENCES leads(id) ON DELETE SET NULL,
  preferred_time TEXT,
  status TEXT NOT NULL DEFAULT 'pending',
  telecaller_notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ─── Commerce sync ───────────────────────────────────────
CREATE TABLE commerce_orders (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  shopify_order_id TEXT NOT NULL UNIQUE,
  order_name TEXT,
  email TEXT,
  phone TEXT,
  financial_status TEXT,
  fulfillment_status TEXT,
  payment_status TEXT,
  total_amount DECIMAL(12, 2),
  currency TEXT DEFAULT 'INR',
  razorpay_payment_id TEXT,
  is_cod BOOLEAN DEFAULT FALSE,
  raw_payload JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_commerce_orders_phone ON commerce_orders(phone);

-- ─── Payments ────────────────────────────────────────────
CREATE TABLE payment_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  provider TEXT NOT NULL DEFAULT 'razorpay',
  external_id TEXT NOT NULL,
  event_type TEXT NOT NULL,
  amount DECIMAL(12, 2),
  currency TEXT DEFAULT 'INR',
  status TEXT,
  metadata JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_payment_events_external ON payment_events(provider, external_id);

-- ─── Shipping ────────────────────────────────────────────
CREATE TABLE shipment_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  shopify_order_id TEXT,
  provider TEXT NOT NULL DEFAULT 'shiprocket',
  shipment_id TEXT,
  awb TEXT,
  courier TEXT,
  status TEXT,
  event_type TEXT,
  raw_payload JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_shipment_awb ON shipment_events(awb);
CREATE INDEX idx_shipment_order ON shipment_events(shopify_order_id);

-- ─── Interactions ────────────────────────────────────────
CREATE TABLE interaction_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  farmer_id UUID REFERENCES farmers(id) ON DELETE SET NULL,
  channel TEXT NOT NULL,
  direction TEXT NOT NULL CHECK (direction IN ('inbound', 'outbound')),
  message_type TEXT DEFAULT 'text',
  content TEXT,
  external_message_id TEXT,
  raw_payload JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_interactions_farmer ON interaction_logs(farmer_id, created_at DESC);

-- ─── Webhooks (idempotency) ──────────────────────────────
CREATE TABLE webhook_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  provider TEXT NOT NULL,
  topic TEXT NOT NULL,
  idempotency_key TEXT NOT NULL,
  payload JSONB,
  status TEXT NOT NULL,
  error_message TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (provider, idempotency_key)
);

-- ─── Event outbox (automation / Zoho / queue M3) ─────────
CREATE TABLE event_outbox (
  id UUID PRIMARY KEY,
  event_type TEXT NOT NULL,
  source TEXT NOT NULL,
  payload JSONB NOT NULL,
  idempotency_key TEXT,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'processed', 'failed')),
  retry_count INT DEFAULT 0,
  processed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_outbox_status ON event_outbox(status, created_at);

-- Zoho sync queue (M3)
CREATE TABLE crm_sync_queue (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  entity_type TEXT NOT NULL,
  entity_id UUID NOT NULL,
  target TEXT NOT NULL DEFAULT 'zoho',
  operation TEXT NOT NULL DEFAULT 'upsert',
  payload JSONB,
  status TEXT NOT NULL DEFAULT 'pending',
  last_error TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- RLS: service role only (API uses service key)
ALTER TABLE farmers ENABLE ROW LEVEL SECURITY;
ALTER TABLE leads ENABLE ROW LEVEL SECURITY;

CREATE POLICY "service_role_all_farmers" ON farmers FOR ALL USING (auth.role() = 'service_role');
CREATE POLICY "service_role_all_leads" ON leads FOR ALL USING (auth.role() = 'service_role');

COMMENT ON TABLE farmers IS 'Core farmer profile — linked to Shopify customer + WhatsApp';
COMMENT ON TABLE event_outbox IS 'Queue-ready domain events for M3 automation';
