-- WhatsApp broadcasts (Scenarios 21–24) + delivery log for throttling (Scenario 40)

ALTER TABLE farmer_crops
  ADD COLUMN IF NOT EXISTS planted_at DATE;

-- Backfill planted_at from created_at where missing
UPDATE farmer_crops
SET planted_at = (created_at AT TIME ZONE 'Asia/Kolkata')::date
WHERE planted_at IS NULL;

-- DAP-triggered and scheduled broadcast rules (admin-editable)
CREATE TABLE IF NOT EXISTS crop_dap_broadcast_rules (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  crop_type TEXT NOT NULL,
  broadcast_kind TEXT NOT NULL CHECK (
    broadcast_kind IN (
      'cultivation_schedule',
      'fertigation_reminder',
      'pgr_broadcast',
      'dap_task'
    )
  ),
  target_dap INT,
  dap_tolerance INT NOT NULL DEFAULT 3,
  min_dap INT,
  max_dap INT,
  weekday INT CHECK (weekday IS NULL OR (weekday >= 0 AND weekday <= 6)),
  priority INT NOT NULL DEFAULT 50,
  active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_dap_broadcast_rules_crop
  ON crop_dap_broadcast_rules(crop_type, broadcast_kind, active);

-- Per-farmer delivery log (throttling + audit)
CREATE TABLE IF NOT EXISTS whatsapp_broadcast_deliveries (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  farmer_id UUID NOT NULL REFERENCES farmers(id) ON DELETE CASCADE,
  broadcast_kind TEXT NOT NULL,
  crop_type TEXT,
  dap_at_send INT,
  rule_id UUID REFERENCES crop_dap_broadcast_rules(id) ON DELETE SET NULL,
  message_body TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'sent' CHECK (status IN ('sent', 'skipped', 'failed')),
  skip_reason TEXT,
  priority INT NOT NULL DEFAULT 50,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_broadcast_deliveries_farmer_time
  ON whatsapp_broadcast_deliveries(farmer_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_broadcast_deliveries_kind_time
  ON whatsapp_broadcast_deliveries(farmer_id, broadcast_kind, created_at DESC);

-- Seed DAP rules (Scenarios 22–24 examples; cultivation_schedule uses weekday only)
INSERT INTO crop_dap_broadcast_rules (crop_type, broadcast_kind, target_dap, dap_tolerance, priority)
SELECT * FROM (VALUES
  ('ginger', 'dap_task', 60, 3, 80),
  ('cardamom', 'dap_task', 90, 5, 75),
  ('ginger', 'fertigation_reminder', 45, 5, 60),
  ('cardamom', 'fertigation_reminder', 120, 7, 60),
  ('cardamom', 'pgr_broadcast', 75, 5, 55),
  ('ginger', 'pgr_broadcast', 30, 5, 55)
) AS v(crop_type, broadcast_kind, target_dap, dap_tolerance, priority)
WHERE NOT EXISTS (SELECT 1 FROM crop_dap_broadcast_rules LIMIT 1);

-- Weekly cultivation schedule — Monday (ISO weekday 1)
INSERT INTO crop_dap_broadcast_rules (crop_type, broadcast_kind, weekday, priority, target_dap, dap_tolerance)
SELECT * FROM (VALUES
  ('ginger', 'cultivation_schedule', 1, 40, NULL::int, 0),
  ('cardamom', 'cultivation_schedule', 1, 40, NULL::int, 0),
  ('pepper', 'cultivation_schedule', 1, 40, NULL::int, 0),
  ('all', 'cultivation_schedule', 1, 35, NULL::int, 0)
) AS v(crop_type, broadcast_kind, weekday, priority, target_dap, dap_tolerance)
WHERE NOT EXISTS (
  SELECT 1 FROM crop_dap_broadcast_rules WHERE broadcast_kind = 'cultivation_schedule' LIMIT 1
);

ALTER TABLE crop_dap_broadcast_rules ENABLE ROW LEVEL SECURITY;
ALTER TABLE whatsapp_broadcast_deliveries ENABLE ROW LEVEL SECURITY;
CREATE POLICY crop_dap_broadcast_rules_service ON crop_dap_broadcast_rules FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY whatsapp_broadcast_deliveries_service ON whatsapp_broadcast_deliveries FOR ALL USING (true) WITH CHECK (true);
