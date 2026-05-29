-- Phase 4: Farmer ROI tracker + ledger (WhatsApp)

CREATE TABLE IF NOT EXISTS farmer_roi_settings (
  farmer_id UUID PRIMARY KEY REFERENCES farmers(id) ON DELETE CASCADE,
  opted_in BOOLEAN NOT NULL DEFAULT false,
  pin_hash TEXT,
  last_daily_prompt_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS farmer_roi_entries (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  farmer_id UUID NOT NULL REFERENCES farmers(id) ON DELETE CASCADE,
  block_id UUID REFERENCES farm_blocks(id) ON DELETE SET NULL,
  crop_type TEXT,
  entry_type TEXT NOT NULL CHECK (
    entry_type IN ('labour', 'purchase', 'misc', 'harvest', 'income')
  ),
  amount_inr NUMERIC(12, 2) NOT NULL CHECK (amount_inr >= 0),
  note TEXT,
  entry_date DATE NOT NULL DEFAULT (CURRENT_DATE),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_farmer_roi_entries_farmer_date
  ON farmer_roi_entries (farmer_id, entry_date DESC);

CREATE TABLE IF NOT EXISTS farmer_roi_audit_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  farmer_id UUID NOT NULL REFERENCES farmers(id) ON DELETE CASCADE,
  entry_id UUID REFERENCES farmer_roi_entries(id) ON DELETE SET NULL,
  action TEXT NOT NULL CHECK (action IN ('create', 'update', 'delete')),
  old_amount_inr NUMERIC(12, 2),
  new_amount_inr NUMERIC(12, 2),
  reason TEXT NOT NULL,
  actor TEXT NOT NULL DEFAULT 'farmer',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_farmer_roi_audit_farmer
  ON farmer_roi_audit_log (farmer_id, created_at DESC);

ALTER TABLE farmer_roi_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE farmer_roi_entries ENABLE ROW LEVEL SECURITY;
ALTER TABLE farmer_roi_audit_log ENABLE ROW LEVEL SECURITY;

CREATE POLICY farmer_roi_settings_service ON farmer_roi_settings FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY farmer_roi_entries_service ON farmer_roi_entries FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY farmer_roi_audit_service ON farmer_roi_audit_log FOR ALL USING (true) WITH CHECK (true);
