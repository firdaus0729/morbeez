-- Extended agriculture / AI / SEO product data (Shopify product id as key)

CREATE TABLE IF NOT EXISTS product_intelligence (
  shopify_product_id TEXT PRIMARY KEY,
  basic JSONB NOT NULL DEFAULT '{}',
  agriculture JSONB NOT NULL DEFAULT '{}',
  ai_mapping JSONB NOT NULL DEFAULT '{}',
  seo JSONB NOT NULL DEFAULT '{}',
  cross_sell JSONB NOT NULL DEFAULT '{}',
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_by UUID REFERENCES admin_users(id)
);

CREATE INDEX IF NOT EXISTS idx_product_intelligence_updated ON product_intelligence (updated_at DESC);

ALTER TABLE product_intelligence ENABLE ROW LEVEL SECURITY;
CREATE POLICY product_intelligence_service_role ON product_intelligence FOR ALL USING (true) WITH CHECK (true);

COMMENT ON TABLE product_intelligence IS 'Morbeez agri-commerce extended fields keyed by Shopify product id';
