-- Demo field findings for Agronomist Hub review queue
-- Requires: field_findings, block_id, archived_at, recommendation_records + field_finding_id

INSERT INTO crm_field_findings (
  id,
  farmer_id,
  lead_id,
  block_id,
  block_name,
  crop_type,
  agronomist_name,
  agronomist_role,
  observations,
  disease_pest,
  disease_tone,
  action_taken,
  follow_up_at,
  photo_urls,
  visited_at,
  archived_at
)
VALUES
  (
    'd0000000-0000-4000-8000-000000000301',
    'd0000000-0000-4000-8000-000000000001',
    'd0000000-0000-4000-8000-000000000101',
    'd0000000-0000-4000-8000-000000000011',
    'Cardamom Block A',
    'cardamom',
    'Dr. Anil Agronomist',
    'Field Agronomist',
    'Yellowing on lower leaves; moderate thrips on panicles. Soil moisture adequate.',
    'Thrips',
    'warning',
    'Sticky trap installed; awaiting AI draft recommendation',
    NOW() + INTERVAL '7 days',
    '[]'::jsonb,
    NOW() - INTERVAL '3 hours',
    NULL
  ),
  (
    'd0000000-0000-4000-8000-000000000302',
    'd0000000-0000-4000-8000-000000000002',
    'd0000000-0000-4000-8000-000000000102',
    'd0000000-0000-4000-8000-000000000012',
    'Ginger North',
    'ginger',
    'Dr. Anil Agronomist',
    'Field Agronomist',
    'Soft rot at rhizome collar; 15% plants affected in north row.',
    'Rhizome rot',
    'danger',
    'Removed severely affected plants; drainage improved',
    NOW() + INTERVAL '5 days',
    '[]'::jsonb,
    NOW() - INTERVAL '1 day',
    NULL
  )
ON CONFLICT (id) DO UPDATE SET
  observations = EXCLUDED.observations,
  disease_pest = EXCLUDED.disease_pest,
  disease_tone = EXCLUDED.disease_tone,
  visited_at = EXCLUDED.visited_at,
  archived_at = NULL;

-- Optional: one finding already has a draft recommendation (hidden from review queue)
INSERT INTO recommendation_records (
  id,
  farmer_id,
  block_id,
  lead_id,
  field_finding_id,
  source,
  issue_detected,
  recommendation_text,
  products,
  dosage,
  status,
  created_by,
  language
)
VALUES (
  'd0000000-0000-4000-8000-000000000401',
  'd0000000-0000-4000-8000-000000000002',
  'd0000000-0000-4000-8000-000000000012',
  'd0000000-0000-4000-8000-000000000102',
  'd0000000-0000-4000-8000-000000000302',
  'field_finding',
  'Rhizome rot',
  'Apply approved fungicide program after soil drying; avoid overhead irrigation for 10 days.',
  '[{"sku":"DEMO-FUNG-1","name":"Demo Fungicide","qty":2}]'::jsonb,
  '2 ml/L foliar spray; repeat after 14 days',
  'draft',
  'agronomist.demo@morbeez.in',
  'en'
)
ON CONFLICT (id) DO UPDATE SET
  status = EXCLUDED.status,
  recommendation_text = EXCLUDED.recommendation_text;
