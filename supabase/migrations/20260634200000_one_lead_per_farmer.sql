-- Enforce one CRM lead per farmer (dedupe existing rows first).

CREATE TEMP TABLE _lead_dedupe_map ON COMMIT DROP AS
WITH ranked AS (
  SELECT
    id,
    farmer_id,
    ROW_NUMBER() OVER (
      PARTITION BY farmer_id
      ORDER BY
        CASE stage
          WHEN 'repeat_customer' THEN 6
          WHEN 'order_placed' THEN 5
          WHEN 'recommendation' THEN 4
          WHEN 'follow_up' THEN 3
          WHEN 'interested' THEN 2
          ELSE 1
        END DESC,
        updated_at DESC NULLS LAST,
        created_at DESC
    ) AS rn
  FROM leads
  WHERE farmer_id IS NOT NULL
)
SELECT r.id AS drop_id, k.id AS keep_id
FROM ranked r
JOIN ranked k ON k.farmer_id = r.farmer_id AND k.rn = 1
WHERE r.rn > 1;

UPDATE quotation_inquiries q
SET lead_id = m.keep_id
FROM _lead_dedupe_map m
WHERE q.lead_id = m.drop_id;

UPDATE callback_requests c
SET lead_id = m.keep_id
FROM _lead_dedupe_map m
WHERE c.lead_id = m.drop_id;

UPDATE crm_field_findings f
SET lead_id = m.keep_id
FROM _lead_dedupe_map m
WHERE f.lead_id = m.drop_id;

UPDATE crm_tasks t
SET lead_id = m.keep_id
FROM _lead_dedupe_map m
WHERE t.lead_id = m.drop_id;

UPDATE crm_call_logs c
SET lead_id = m.keep_id
FROM _lead_dedupe_map m
WHERE c.lead_id = m.drop_id;

DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.tables
    WHERE table_schema = 'public' AND table_name = 'crm_actions'
  ) THEN
    UPDATE crm_actions a
    SET lead_id = m.keep_id
    FROM _lead_dedupe_map m
    WHERE a.lead_id = m.drop_id;
  END IF;
END $$;

DELETE FROM leads l
USING _lead_dedupe_map m
WHERE l.id = m.drop_id;

CREATE UNIQUE INDEX IF NOT EXISTS idx_leads_one_per_farmer
  ON leads (farmer_id)
  WHERE farmer_id IS NOT NULL;

COMMENT ON INDEX idx_leads_one_per_farmer IS 'Telecaller CRM: at most one lead row per farmer';
