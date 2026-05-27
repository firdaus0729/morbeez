-- Demo leads and CRM tasks (Telecaller + Employee workspace metrics)
-- Requires: telecaller CRM migration (leads.stage, crm_tasks)

INSERT INTO leads (id, farmer_id, intent, source, status, stage, assigned_to, notes, follow_up_at)
VALUES
  (
    'd0000000-0000-4000-8000-000000000101',
    'd0000000-0000-4000-8000-000000000001',
    'callback',
    'whatsapp',
    'contacted',
    'follow_up',
    'telecaller.demo@morbeez.in',
    'Interested in cardamom nutrition program',
    NOW() + INTERVAL '1 day'
  ),
  (
    'd0000000-0000-4000-8000-000000000102',
    'd0000000-0000-4000-8000-000000000002',
    'quotation',
    'field_visit',
    'qualified',
    'recommendation',
    'telecaller.demo@morbeez.in',
    'Ginger rhizome rot — awaiting agronomist rec',
    NOW() + INTERVAL '2 days'
  ),
  (
    'd0000000-0000-4000-8000-000000000103',
    'd0000000-0000-4000-8000-000000000003',
    'general',
    'website',
    'new',
    'new_lead',
    'telecaller.demo@morbeez.in',
    'Banana bunch weight concern',
    NOW() + INTERVAL '4 hours'
  )
ON CONFLICT (id) DO UPDATE SET
  stage = EXCLUDED.stage,
  assigned_to = EXCLUDED.assigned_to,
  notes = EXCLUDED.notes,
  follow_up_at = EXCLUDED.follow_up_at;

INSERT INTO crm_tasks (id, farmer_id, lead_id, assigned_to, task_type, title, due_at, status)
VALUES
  (
    'd0000000-0000-4000-8000-000000000201',
    'd0000000-0000-4000-8000-000000000001',
    'd0000000-0000-4000-8000-000000000101',
    'telecaller.demo@morbeez.in',
    'follow_up',
    'Call Ravi — nutrition follow-up',
    NOW() + INTERVAL '6 hours',
    'pending'
  ),
  (
    'd0000000-0000-4000-8000-000000000202',
    'd0000000-0000-4000-8000-000000000002',
    'd0000000-0000-4000-8000-000000000102',
    'telecaller.demo@morbeez.in',
    'whatsapp',
    'Send ginger spray quote',
    NOW() + INTERVAL '1 day',
    'pending'
  ),
  (
    'd0000000-0000-4000-8000-000000000203',
    'd0000000-0000-4000-8000-000000000003',
    'd0000000-0000-4000-8000-000000000103',
    'agronomist.demo@morbeez.in',
    'visit',
    'Field visit — banana plot B-2',
    NOW() + INTERVAL '2 days',
    'pending'
  )
ON CONFLICT (id) DO UPDATE SET
  title = EXCLUDED.title,
  due_at = EXCLUDED.due_at,
  status = EXCLUDED.status;
