-- Scenarios 35–36: order tracking + payment failed WhatsApp notifications

ALTER TABLE commerce_orders
  ADD COLUMN IF NOT EXISTS tracking_awb TEXT,
  ADD COLUMN IF NOT EXISTS tracking_url TEXT,
  ADD COLUMN IF NOT EXISTS expected_delivery_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS farmer_id UUID REFERENCES farmers(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_commerce_orders_farmer ON commerce_orders(farmer_id);

CREATE TABLE IF NOT EXISTS whatsapp_order_notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  farmer_id UUID REFERENCES farmers(id) ON DELETE SET NULL,
  phone TEXT NOT NULL,
  event_type TEXT NOT NULL CHECK (event_type IN ('dispatched', 'payment_failed', 'delivered')),
  reference_key TEXT NOT NULL UNIQUE,
  commerce_order_id UUID REFERENCES commerce_orders(id) ON DELETE SET NULL,
  checkout_session_id UUID,
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_whatsapp_order_notif_phone
  ON whatsapp_order_notifications(phone, created_at DESC);

ALTER TABLE whatsapp_order_notifications ENABLE ROW LEVEL SECURITY;
CREATE POLICY whatsapp_order_notifications_service ON whatsapp_order_notifications FOR ALL USING (true) WITH CHECK (true);
