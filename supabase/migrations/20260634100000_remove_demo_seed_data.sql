-- Remove archive/demo seed farmers, field findings, and related CRM rows.

DELETE FROM recommendation_records
WHERE id = 'd0000000-0000-4000-8000-000000000401'
   OR field_finding_id IN (
     'd0000000-0000-4000-8000-000000000301',
     'd0000000-0000-4000-8000-000000000302'
   )
   OR farmer_id IN (SELECT id FROM farmers WHERE source = 'demo_seed');

DELETE FROM crm_field_findings
WHERE id IN (
  'd0000000-0000-4000-8000-000000000301',
  'd0000000-0000-4000-8000-000000000302'
)
OR farmer_id IN (SELECT id FROM farmers WHERE source = 'demo_seed');

DELETE FROM crm_tasks
WHERE farmer_id IN (SELECT id FROM farmers WHERE source = 'demo_seed')
   OR lead_id IN (
     'd0000000-0000-4000-8000-000000000101',
     'd0000000-0000-4000-8000-000000000102',
     'd0000000-0000-4000-8000-000000000103'
   );

DELETE FROM leads
WHERE id IN (
  'd0000000-0000-4000-8000-000000000101',
  'd0000000-0000-4000-8000-000000000102',
  'd0000000-0000-4000-8000-000000000103'
)
OR farmer_id IN (SELECT id FROM farmers WHERE source = 'demo_seed');

DELETE FROM telecaller_notes
WHERE farmer_id IN (SELECT id FROM farmers WHERE source = 'demo_seed');

DELETE FROM agronomist_escalations
WHERE farmer_id IN (SELECT id FROM farmers WHERE source = 'demo_seed');

DELETE FROM ai_advisory_outputs
WHERE session_id IN (
  SELECT id FROM ai_advisory_sessions
  WHERE farmer_id IN (SELECT id FROM farmers WHERE source = 'demo_seed')
);

DELETE FROM ai_advisory_sessions
WHERE farmer_id IN (SELECT id FROM farmers WHERE source = 'demo_seed');

DELETE FROM farm_blocks
WHERE id IN (
  'd0000000-0000-4000-8000-000000000011',
  'd0000000-0000-4000-8000-000000000012',
  'd0000000-0000-4000-8000-000000000013'
)
OR farmer_id IN (SELECT id FROM farmers WHERE source = 'demo_seed');

DELETE FROM farmers
WHERE source = 'demo_seed'
   OR id IN (
     'd0000000-0000-4000-8000-000000000001',
     'd0000000-0000-4000-8000-000000000002',
     'd0000000-0000-4000-8000-000000000003'
   );
