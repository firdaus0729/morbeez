-- Scenario 29: optional display label per crop/plot row
ALTER TABLE farmer_crops
  ADD COLUMN IF NOT EXISTS plot_label TEXT;

COMMENT ON COLUMN farmer_crops.plot_label IS 'WhatsApp plot picker label, e.g. Ginger Plot A';
