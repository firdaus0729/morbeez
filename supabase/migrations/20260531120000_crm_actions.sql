-- CRM actions: manual orders, archive support, task block link

ALTER TABLE crm_recommendations
  DROP CONSTRAINT IF EXISTS crm_recommendations_status_check;

ALTER TABLE crm_recommendations
  ADD CONSTRAINT crm_recommendations_status_check
  CHECK (status IN ('active', 'pending', 'completed', 'cancelled', 'archived', 'converted'));

ALTER TABLE crm_field_findings
  ADD COLUMN IF NOT EXISTS archived_at TIMESTAMPTZ;

ALTER TABLE crm_tasks
  ADD COLUMN IF NOT EXISTS block_id UUID REFERENCES farm_blocks(id) ON DELETE SET NULL;

CREATE TABLE IF NOT EXISTS crm_manual_orders (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  farmer_id UUID NOT NULL REFERENCES farmers(id) ON DELETE CASCADE,
  lead_id UUID REFERENCES leads(id) ON DELETE SET NULL,
  block_id UUID REFERENCES farm_blocks(id) ON DELETE SET NULL,
  recommendation_id UUID REFERENCES crm_recommendations(id) ON DELETE SET NULL,
  order_ref TEXT NOT NULL,
  line_items JSONB NOT NULL DEFAULT '[]',
  payment_mode TEXT,
  delivery_address TEXT,
  total_amount DECIMAL(12, 2) NOT NULL DEFAULT 0,
  status TEXT NOT NULL DEFAULT 'pending'
    CHECK (status IN ('pending', 'confirmed', 'fulfilled', 'cancelled')),
  notes TEXT,
  created_by TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_crm_manual_orders_farmer ON crm_manual_orders (farmer_id, created_at DESC);

ALTER TABLE crm_manual_orders ENABLE ROW LEVEL SECURITY;
CREATE POLICY crm_manual_orders_service ON crm_manual_orders FOR ALL USING (true) WITH CHECK (true);
