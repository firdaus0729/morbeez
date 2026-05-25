-- Morbeez admin: agriculture product combo bundles

CREATE TABLE IF NOT EXISTS commerce_combos (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  product_count INTEGER NOT NULL DEFAULT 1,
  products JSONB NOT NULL DEFAULT '[]',
  mrp DECIMAL(12, 2) NOT NULL,
  combo_price DECIMAL(12, 2) NOT NULL,
  discount_percent INTEGER NOT NULL DEFAULT 0,
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'inactive')),
  sales_mtd DECIMAL(14, 2) NOT NULL DEFAULT 0,
  description TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_commerce_combos_status ON commerce_combos (status);
CREATE INDEX IF NOT EXISTS idx_commerce_combos_name ON commerce_combos (name);

ALTER TABLE commerce_combos ENABLE ROW LEVEL SECURITY;
CREATE POLICY commerce_combos_service_role ON commerce_combos FOR ALL USING (true) WITH CHECK (true);

INSERT INTO commerce_combos (name, product_count, mrp, combo_price, discount_percent, status, sales_mtd, description)
SELECT * FROM (VALUES
  ('Pest Control Combo', 3, 2450, 1899, 22, 'active', 185420, 'Insecticide + fungicide + sticker spreader kit'),
  ('Disease Control Combo', 4, 3200, 2399, 25, 'active', 142300, 'Broad-spectrum disease management pack'),
  ('Crop Booster Combo', 3, 1890, 1499, 21, 'active', 98450, 'Growth regulator and micronutrient foliar set'),
  ('Nutrient Combo Pack', 5, 4100, 3199, 22, 'active', 210800, 'NPK + calcium + magnesium bundle'),
  ('Organic Input Kit', 2, 1650, 1299, 21, 'active', 45200, 'Vermicompost + bio fertilizer starter'),
  ('Foliar Spray Bundle', 3, 2780, 2199, 21, 'inactive', 12800, 'Seasonal foliar nutrition pack'),
  ('Rice Protection Kit', 4, 3650, 2799, 23, 'active', 167900, 'Paddy pest and disease protection'),
  ('Cotton Care Combo', 3, 2980, 2349, 21, 'active', 88900, 'Bollworm and sucking pest control'),
  ('Vegetable Starter Pack', 4, 2200, 1749, 21, 'active', 76300, 'Tomato-chilli protected cultivation kit'),
  ('Drip Fertigation Set', 3, 4500, 3599, 20, 'active', 198400, 'Water-soluble fertigation combo'),
  ('Soil Health Combo', 2, 1950, 1549, 21, 'active', 34100, 'Soil conditioner + humic acid'),
  ('Monsoon Ready Kit', 5, 5200, 3999, 23, 'active', 256700, 'Pre-monsoon preventive spray bundle'),
  ('Chilli Special Combo', 3, 2650, 2099, 21, 'inactive', 9200, 'Thrips and leaf curl management'),
  ('Grape Vineyard Pack', 4, 5800, 4499, 22, 'active', 112600, 'Powdery mildew and nutrient combo'),
  ('Soybean Shield Combo', 3, 2400, 1899, 21, 'active', 67800, 'Rust and caterpillar protection'),
  ('Maize Max Combo', 3, 2550, 1999, 22, 'active', 54300, 'Fall armyworm focused kit'),
  ('Potato Protection Pack', 4, 3100, 2449, 21, 'active', 87400, 'Late blight and tuber health'),
  ('Mango Orchard Combo', 3, 3400, 2699, 21, 'active', 156200, 'Powdery mildew and fruit fly management'),
  ('Tea Estate Bundle', 4, 4800, 3799, 21, 'active', 203100, 'Red spider mite and blister blight set'),
  ('Hybrid Seed Treatment Kit', 2, 1200, 949, 21, 'active', 28900, 'Seed dresser + bio-stimulant'),
  ('Greenhouse IPM Pack', 5, 6200, 4899, 21, 'active', 178500, 'Integrated pest management for polyhouse'),
  ('Bio-Pesticide Trio', 3, 2100, 1649, 21, 'inactive', 5600, 'Neem + Trichoderma + Beauveria'),
  ('Micronutrient Booster', 2, 1450, 1149, 21, 'active', 41200, 'Zinc + boron + iron correction'),
  ('Dealer Bulk Combo A', 6, 8900, 6999, 21, 'active', 445230, 'High-volume dealer bundle')
) AS v(name, product_count, mrp, combo_price, discount_percent, status, sales_mtd, description)
WHERE NOT EXISTS (SELECT 1 FROM commerce_combos LIMIT 1);
