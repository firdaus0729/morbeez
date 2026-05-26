-- Telecaller CRM — pipeline stages, tasks, call logs

ALTER TABLE leads
  ADD COLUMN IF NOT EXISTS stage TEXT NOT NULL DEFAULT 'new_lead'
    CHECK (stage IN (
      'new_lead',
      'interested',
      'follow_up',
      'recommendation',
      'order_placed',
      'repeat_customer'
    ));

ALTER TABLE leads
  ADD COLUMN IF NOT EXISTS last_interaction_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS lead_score DECIMAL(3, 1);

CREATE INDEX IF NOT EXISTS idx_leads_stage ON leads(stage);
CREATE INDEX IF NOT EXISTS idx_leads_assigned ON leads(assigned_to);
CREATE INDEX IF NOT EXISTS idx_leads_follow_up ON leads(follow_up_at);

UPDATE leads SET stage = 'new_lead' WHERE stage IS NULL;

UPDATE leads SET stage = 'order_placed'
  WHERE status = 'won' AND stage = 'new_lead';

CREATE TABLE IF NOT EXISTS crm_tasks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  farmer_id UUID NOT NULL REFERENCES farmers(id) ON DELETE CASCADE,
  lead_id UUID REFERENCES leads(id) ON DELETE SET NULL,
  assigned_to TEXT,
  task_type TEXT NOT NULL DEFAULT 'follow_up'
    CHECK (task_type IN ('follow_up', 'call', 'whatsapp', 'visit', 'other')),
  title TEXT NOT NULL,
  notes TEXT,
  due_at TIMESTAMPTZ,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'done', 'cancelled')),
  completed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_crm_tasks_assigned ON crm_tasks(assigned_to, status, due_at);
CREATE INDEX IF NOT EXISTS idx_crm_tasks_farmer ON crm_tasks(farmer_id);

CREATE TABLE IF NOT EXISTS crm_call_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  farmer_id UUID NOT NULL REFERENCES farmers(id) ON DELETE CASCADE,
  lead_id UUID REFERENCES leads(id) ON DELETE SET NULL,
  agent_email TEXT NOT NULL,
  direction TEXT NOT NULL DEFAULT 'outbound' CHECK (direction IN ('inbound', 'outbound')),
  outcome TEXT,
  duration_seconds INT,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_crm_calls_farmer ON crm_call_logs(farmer_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_crm_calls_agent ON crm_call_logs(agent_email, created_at DESC);

ALTER TABLE crm_tasks ENABLE ROW LEVEL SECURITY;
ALTER TABLE crm_call_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY crm_tasks_service_role ON crm_tasks FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY crm_call_logs_service_role ON crm_call_logs FOR ALL USING (true) WITH CHECK (true);

COMMENT ON COLUMN leads.stage IS 'Telecaller pipeline: new_lead → repeat_customer';
