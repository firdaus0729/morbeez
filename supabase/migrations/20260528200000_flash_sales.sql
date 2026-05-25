-- Morbeez admin: flash sale campaigns

CREATE TABLE IF NOT EXISTS commerce_flash_sales (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  product_name TEXT NOT NULL,
  image_url TEXT,
  flash_price DECIMAL(12, 2) NOT NULL,
  original_price DECIMAL(12, 2) NOT NULL,
  discount_percent INTEGER NOT NULL DEFAULT 0,
  starts_at TIMESTAMPTZ NOT NULL,
  ends_at TIMESTAMPTZ NOT NULL,
  stock_total INTEGER NOT NULL DEFAULT 100,
  stock_sold INTEGER NOT NULL DEFAULT 0,
  sales_mtd DECIMAL(14, 2) NOT NULL DEFAULT 0,
  shopify_product_id TEXT,
  description TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_flash_sales_dates ON commerce_flash_sales (starts_at, ends_at);

ALTER TABLE commerce_flash_sales ENABLE ROW LEVEL SECURITY;
CREATE POLICY commerce_flash_sales_service_role ON commerce_flash_sales FOR ALL USING (true) WITH CHECK (true);

-- Seed when empty (dates relative to NOW())
INSERT INTO commerce_flash_sales (
  product_name, image_url, flash_price, original_price, discount_percent,
  starts_at, ends_at, stock_total, stock_sold, sales_mtd, description
)
SELECT * FROM (VALUES
  (
    'Chakraveer 18.5 SC',
    NULL::text,
    1299::decimal, 1999::decimal, 35,
    NOW() - INTERVAL '1 day', NOW() + INTERVAL '2 days',
    200, 142, 245600,
    'Limited flash on bestseller insecticide'
  ),
  (
    'Katyayani Chlorantraniliprole 18.5 SC',
    NULL::text,
    899::decimal, 1349::decimal, 33,
    NOW() - INTERVAL '6 hours', NOW() + INTERVAL '3 days',
    150, 78, 189400,
    'Flash pricing on 250 ml pack'
  ),
  (
    'Confidor Super 200 SL',
    NULL::text,
    749::decimal, 1099::decimal, 32,
    NOW() - INTERVAL '12 hours', NOW() + INTERVAL '1 day',
    120, 95, 156200,
    '24-hour lightning deal'
  ),
  (
    'Tata Rallis Proclaim 5 SG',
    NULL::text,
    2199::decimal, 2899::decimal, 24,
    NOW() + INTERVAL '2 days', NOW() + INTERVAL '9 days',
    80, 0, 0,
    'Upcoming weekend flash'
  ),
  (
    'Bayer Movento Energy',
    NULL::text,
    3499::decimal, 4299::decimal, 19,
    NOW() + INTERVAL '5 days', NOW() + INTERVAL '12 days',
    60, 0, 0,
    'Pre-booking flash slot'
  ),
  (
    'UPL Saaf Fungicide',
    NULL::text,
    449::decimal, 649::decimal, 31,
    NOW() - INTERVAL '45 days', NOW() - INTERVAL '38 days',
    300, 300, 98400,
    'Completed April flash'
  ),
  (
    'Coragen Insecticide',
    NULL::text,
    2899::decimal, 3599::decimal, 19,
    NOW() - INTERVAL '60 days', NOW() - INTERVAL '52 days',
    100, 100, 142300,
    'Completed March campaign'
  ),
  (
    'Mahindra Summit Garuda',
    NULL::text,
    1599::decimal, 2199::decimal, 27,
    NOW() - INTERVAL '50 days', NOW() - INTERVAL '43 days',
    180, 167, 198700,
    'Completed spring flash'
  ),
  (
    'Dhanuka Super D 75 WP',
    NULL::text,
    299::decimal, 449::decimal, 33,
    NOW() - INTERVAL '40 days', NOW() - INTERVAL '33 days',
    250, 241, 87600,
    'Completed herbicide flash'
  ),
  (
    'Syngenta Ampligo',
    NULL::text,
    1899::decimal, 2499::decimal, 24,
    NOW() - INTERVAL '35 days', NOW() - INTERVAL '28 days',
    90, 90, 112400,
    'Completed combo week'
  ),
  (
    'FMC Authority 480 SC',
    NULL::text,
    1199::decimal, 1699::decimal, 29,
    NOW() - INTERVAL '30 days', NOW() - INTERVAL '23 days',
    110, 108, 95400,
    'Completed pre-monsoon'
  ),
  (
    'Indofil Nuvan 77 EC',
    NULL::text,
    399::decimal, 599::decimal, 33,
    NOW() - INTERVAL '28 days', NOW() - INTERVAL '21 days',
    200, 195, 67800,
    'Completed clearance'
  ),
  (
    'BASF Sefina',
    NULL::text,
    2499::decimal, 3199::decimal, 22,
    NOW() - INTERVAL '25 days', NOW() - INTERVAL '18 days',
    70, 70, 134500,
    'Completed premium flash'
  ),
  (
    'PI Karate 5 EC',
    NULL::text,
    549::decimal, 799::decimal, 31,
    NOW() - INTERVAL '22 days', NOW() - INTERVAL '15 days',
    160, 152, 72100,
    'Completed kharif prep'
  ),
  (
    'Adama Shaked 200 SL',
    NULL::text,
    899::decimal, 1299::decimal, 31,
    NOW() - INTERVAL '20 days', NOW() - INTERVAL '13 days',
    130, 128, 88900,
    'Completed foliar week'
  ),
  (
    'Rallis Ergon 55 EC',
    NULL::text,
    649::decimal, 949::decimal, 32,
    NOW() - INTERVAL '18 days', NOW() - INTERVAL '11 days',
    140, 132, 76500,
    'Completed rice season'
  ),
  (
    'Dow Delegate 250 WG',
    NULL::text,
    1699::decimal, 2299::decimal, 26,
    NOW() - INTERVAL '15 days', NOW() - INTERVAL '8 days',
    85, 85, 108200,
    'Completed cotton flash'
  )
) AS v(product_name, image_url, flash_price, original_price, discount_percent, starts_at, ends_at, stock_total, stock_sold, sales_mtd, description)
WHERE NOT EXISTS (SELECT 1 FROM commerce_flash_sales LIMIT 1);
