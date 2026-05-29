-- ROI ledger v2 (debit/credit, comments, one-time staff edit) + farmer master fields

ALTER TABLE farmer_roi_entries
  ADD COLUMN IF NOT EXISTS comments TEXT,
  ADD COLUMN IF NOT EXISTS debit_inr NUMERIC(12, 2) CHECK (debit_inr IS NULL OR debit_inr >= 0),
  ADD COLUMN IF NOT EXISTS credit_inr NUMERIC(12, 2) CHECK (credit_inr IS NULL OR credit_inr >= 0),
  ADD COLUMN IF NOT EXISTS staff_edited_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS staff_edited_by TEXT,
  ADD COLUMN IF NOT EXISTS staff_edit_used BOOLEAN NOT NULL DEFAULT false;

UPDATE farmer_roi_entries
SET
  debit_inr = CASE
    WHEN entry_type IN ('labour', 'purchase', 'misc') THEN amount_inr
    ELSE debit_inr
  END,
  credit_inr = CASE
    WHEN entry_type IN ('harvest', 'income') THEN amount_inr
    ELSE credit_inr
  END,
  comments = COALESCE(comments, note)
WHERE debit_inr IS NULL AND credit_inr IS NULL;

ALTER TABLE farmer_roi_audit_log
  ADD COLUMN IF NOT EXISTS old_snapshot JSONB,
  ADD COLUMN IF NOT EXISTS new_snapshot JSONB,
  ADD COLUMN IF NOT EXISTS edited_by TEXT;

-- Farmer master (minimal columns; crops stay in farm_blocks)
ALTER TABLE farmers
  ADD COLUMN IF NOT EXISTS whatsapp_phone TEXT,
  ADD COLUMN IF NOT EXISTS whatsapp_same_as_phone BOOLEAN NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS shipping_address TEXT,
  ADD COLUMN IF NOT EXISTS delivery_pincode CHAR(6),
  ADD COLUMN IF NOT EXISTS total_acreage DECIMAL(10, 2),
  ADD COLUMN IF NOT EXISTS roi_enabled BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS farmer_notes TEXT,
  ADD COLUMN IF NOT EXISTS assigned_crop_advisor TEXT;

COMMENT ON COLUMN farmers.assigned_crop_advisor IS 'Staff email of assigned crop advisor';
