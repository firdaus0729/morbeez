-- One open agronomist escalation per farmer (dedupe existing rows first).

CREATE TEMP TABLE _escalation_dedupe_map ON COMMIT DROP AS
WITH ranked AS (
  SELECT
    id,
    farmer_id,
    ROW_NUMBER() OVER (
      PARTITION BY farmer_id
      ORDER BY
        CASE priority
          WHEN 'urgent' THEN 4
          WHEN 'high' THEN 3
          WHEN 'normal' THEN 2
          ELSE 1
        END DESC,
        updated_at DESC NULLS LAST,
        created_at DESC
    ) AS rn
  FROM agronomist_escalations
  WHERE status IN ('pending', 'assigned', 'in_review')
)
SELECT r.id AS drop_id, k.id AS keep_id
FROM ranked r
JOIN ranked k ON k.farmer_id = r.farmer_id AND k.rn = 1
WHERE r.rn > 1;

UPDATE farmer_advisory_feedback fb
SET escalation_id = m.keep_id
FROM _escalation_dedupe_map m
WHERE fb.escalation_id = m.drop_id;

UPDATE telecaller_notes n
SET escalation_id = m.keep_id
FROM _escalation_dedupe_map m
WHERE n.escalation_id = m.drop_id;

UPDATE agronomist_escalations e
SET
  status = 'closed',
  resolution = 'superseded',
  resolved_at = NOW(),
  updated_at = NOW()
FROM _escalation_dedupe_map m
WHERE e.id = m.drop_id;

CREATE UNIQUE INDEX IF NOT EXISTS idx_escalations_one_open_per_farmer
  ON agronomist_escalations (farmer_id)
  WHERE status IN ('pending', 'assigned', 'in_review');

COMMENT ON INDEX idx_escalations_one_open_per_farmer IS
  'Case review queue: at most one open escalation per farmer';
