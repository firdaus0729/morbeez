-- Phase-1 AOS: Employee HR, attendance, incentives, payroll, reassignment

CREATE TABLE IF NOT EXISTS employee_profiles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  admin_user_id UUID REFERENCES admin_users(id) ON DELETE CASCADE,
  employee_code TEXT NOT NULL UNIQUE,
  full_name TEXT NOT NULL,
  personal_mobile TEXT,
  company_whatsapp TEXT,
  alternate_mobile TEXT,
  email TEXT,
  profile_photo_url TEXT,
  gender TEXT,
  date_of_birth DATE,
  joining_date DATE,
  role TEXT NOT NULL,
  department TEXT,
  reporting_manager_id UUID REFERENCES admin_users(id) ON DELETE SET NULL,
  employment_type TEXT NOT NULL DEFAULT 'full_time',
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'inactive')),
  state TEXT,
  district TEXT,
  taluk TEXT,
  pincode_id UUID REFERENCES pincode_master(id) ON DELETE SET NULL,
  address TEXT,
  languages JSONB NOT NULL DEFAULT '[]',
  crops_expertise JSONB NOT NULL DEFAULT '[]',
  disease_knowledge_rating INT NOT NULL DEFAULT 0,
  whatsapp_skill_rating INT NOT NULL DEFAULT 0,
  customer_handling_rating INT NOT NULL DEFAULT 0,
  field_experience_years NUMERIC(5, 2) NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_employee_profiles_role_status
  ON employee_profiles(role, status);
CREATE INDEX IF NOT EXISTS idx_employee_profiles_district
  ON employee_profiles(state, district, taluk);

CREATE TABLE IF NOT EXISTS employee_compensation (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  employee_profile_id UUID NOT NULL REFERENCES employee_profiles(id) ON DELETE CASCADE,
  fixed_salary NUMERIC(12, 2) NOT NULL DEFAULT 0,
  incentive_enabled BOOLEAN NOT NULL DEFAULT true,
  salary_cycle TEXT NOT NULL DEFAULT 'monthly',
  joining_bonus NUMERIC(12, 2) NOT NULL DEFAULT 0,
  travel_allowance NUMERIC(12, 2) NOT NULL DEFAULT 0,
  monthly_sales_target NUMERIC(12, 2) NOT NULL DEFAULT 0,
  incentive_pct_after_target NUMERIC(6, 2) NOT NULL DEFAULT 0,
  conversion_bonus_enabled BOOLEAN NOT NULL DEFAULT false,
  conversion_target_pct NUMERIC(6, 2) NOT NULL DEFAULT 50,
  additional_bonus_after_conversion NUMERIC(12, 2) NOT NULL DEFAULT 0,
  retention_bonus_enabled BOOLEAN NOT NULL DEFAULT false,
  relationship_bonus_enabled BOOLEAN NOT NULL DEFAULT false,
  follow_up_bonus_enabled BOOLEAN NOT NULL DEFAULT false,
  farmer_retention_bonus NUMERIC(12, 2) NOT NULL DEFAULT 0,
  recommendation_success_bonus NUMERIC(12, 2) NOT NULL DEFAULT 0,
  escalation_bonus NUMERIC(12, 2) NOT NULL DEFAULT 0,
  km_allowance_enabled BOOLEAN NOT NULL DEFAULT false,
  rate_per_km NUMERIC(10, 2) NOT NULL DEFAULT 0,
  field_visit_bonus NUMERIC(12, 2) NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(employee_profile_id)
);

CREATE TABLE IF NOT EXISTS employee_attendance_rules (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  employee_profile_id UUID NOT NULL REFERENCES employee_profiles(id) ON DELETE CASCADE,
  min_daily_hours NUMERIC(4, 2) NOT NULL DEFAULT 9,
  monthly_working_days INT NOT NULL DEFAULT 23,
  working_window_start TIME NOT NULL DEFAULT '08:00',
  working_window_end TIME NOT NULL DEFAULT '19:00',
  idle_warning_threshold_minutes INT NOT NULL DEFAULT 45,
  full_day_min_hours NUMERIC(4, 2) NOT NULL DEFAULT 9,
  half_day_min_hours NUMERIC(4, 2) NOT NULL DEFAULT 6,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(employee_profile_id)
);

CREATE TABLE IF NOT EXISTS employee_access_tokens (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  employee_profile_id UUID NOT NULL REFERENCES employee_profiles(id) ON DELETE CASCADE,
  token_hash TEXT NOT NULL UNIQUE,
  purpose TEXT NOT NULL CHECK (purpose IN ('setup_password', 'reset_password')),
  delivery_channels JSONB NOT NULL DEFAULT '[]',
  expires_at TIMESTAMPTZ NOT NULL,
  used_at TIMESTAMPTZ,
  created_by UUID REFERENCES admin_users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_employee_access_tokens_lookup
  ON employee_access_tokens(employee_profile_id, purpose, expires_at)
  WHERE used_at IS NULL;

CREATE TABLE IF NOT EXISTS activity_evidence_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  employee_profile_id UUID NOT NULL REFERENCES employee_profiles(id) ON DELETE CASCADE,
  event_date DATE NOT NULL,
  event_type TEXT NOT NULL CHECK (
    event_type IN ('call', 'whatsapp', 'crm_update', 'follow_up', 'recommendation', 'field_upload', 'punch_in', 'punch_out')
  ),
  event_count INT NOT NULL DEFAULT 1,
  active_minutes NUMERIC(8, 2) NOT NULL DEFAULT 0,
  metadata JSONB NOT NULL DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_activity_evidence_logs_daily
  ON activity_evidence_logs(employee_profile_id, event_date);

CREATE TABLE IF NOT EXISTS attendance_daily (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  employee_profile_id UUID NOT NULL REFERENCES employee_profiles(id) ON DELETE CASCADE,
  attendance_date DATE NOT NULL,
  total_active_minutes NUMERIC(8, 2) NOT NULL DEFAULT 0,
  total_calls INT NOT NULL DEFAULT 0,
  total_whatsapp_events INT NOT NULL DEFAULT 0,
  total_crm_updates INT NOT NULL DEFAULT 0,
  day_status TEXT NOT NULL DEFAULT 'absent' CHECK (day_status IN ('full_day', 'half_day', 'absent')),
  idle_warning_triggered BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(employee_profile_id, attendance_date)
);

CREATE TABLE IF NOT EXISTS attendance_monthly_summary (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  employee_profile_id UUID NOT NULL REFERENCES employee_profiles(id) ON DELETE CASCADE,
  year INT NOT NULL,
  month INT NOT NULL CHECK (month BETWEEN 1 AND 12),
  full_days INT NOT NULL DEFAULT 0,
  half_days INT NOT NULL DEFAULT 0,
  absent_days INT NOT NULL DEFAULT 0,
  worked_days NUMERIC(6, 2) NOT NULL DEFAULT 0,
  salary_eligibility BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(employee_profile_id, year, month)
);

CREATE TABLE IF NOT EXISTS payroll_cycles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  year INT NOT NULL,
  month INT NOT NULL CHECK (month BETWEEN 1 AND 12),
  run_date TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  status TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'finalized', 'sent')),
  created_by UUID REFERENCES admin_users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(year, month)
);

CREATE TABLE IF NOT EXISTS payroll_entries (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  payroll_cycle_id UUID NOT NULL REFERENCES payroll_cycles(id) ON DELETE CASCADE,
  employee_profile_id UUID NOT NULL REFERENCES employee_profiles(id) ON DELETE CASCADE,
  fixed_salary NUMERIC(12, 2) NOT NULL DEFAULT 0,
  estimated_incentive NUMERIC(12, 2) NOT NULL DEFAULT 0,
  bonuses NUMERIC(12, 2) NOT NULL DEFAULT 0,
  km_allowance NUMERIC(12, 2) NOT NULL DEFAULT 0,
  deductions NUMERIC(12, 2) NOT NULL DEFAULT 0,
  final_salary NUMERIC(12, 2) NOT NULL DEFAULT 0,
  details JSONB NOT NULL DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(payroll_cycle_id, employee_profile_id)
);

CREATE TABLE IF NOT EXISTS payroll_pdfs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  payroll_entry_id UUID NOT NULL REFERENCES payroll_entries(id) ON DELETE CASCADE,
  storage_url TEXT NOT NULL,
  generated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  generated_by UUID REFERENCES admin_users(id) ON DELETE SET NULL
);

CREATE TABLE IF NOT EXISTS payout_delivery_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  payroll_entry_id UUID NOT NULL REFERENCES payroll_entries(id) ON DELETE CASCADE,
  channel TEXT NOT NULL CHECK (channel IN ('whatsapp', 'email', 'dashboard')),
  delivery_status TEXT NOT NULL CHECK (delivery_status IN ('queued', 'sent', 'failed')),
  delivered_at TIMESTAMPTZ,
  metadata JSONB NOT NULL DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS reassignment_runs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  deactivated_employee_profile_id UUID NOT NULL REFERENCES employee_profiles(id) ON DELETE CASCADE,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'completed', 'failed')),
  started_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  completed_at TIMESTAMPTZ,
  summary JSONB NOT NULL DEFAULT '{}'
);

CREATE TABLE IF NOT EXISTS reassignment_decisions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  reassignment_run_id UUID NOT NULL REFERENCES reassignment_runs(id) ON DELETE CASCADE,
  item_type TEXT NOT NULL CHECK (item_type IN ('farmer', 'lead', 'task', 'escalation', 'relationship')),
  item_id UUID NOT NULL,
  from_employee_profile_id UUID NOT NULL REFERENCES employee_profiles(id) ON DELETE CASCADE,
  to_employee_profile_id UUID NOT NULL REFERENCES employee_profiles(id) ON DELETE CASCADE,
  language_score INT NOT NULL DEFAULT 0,
  crop_score INT NOT NULL DEFAULT 0,
  district_score INT NOT NULL DEFAULT 0,
  workload_score INT NOT NULL DEFAULT 0,
  relationship_score INT NOT NULL DEFAULT 0,
  total_score INT NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS reassignment_transfers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  reassignment_run_id UUID NOT NULL REFERENCES reassignment_runs(id) ON DELETE CASCADE,
  transfer_type TEXT NOT NULL CHECK (transfer_type IN ('farmers', 'leads', 'whatsapp_chats', 'followups', 'tasks', 'escalations', 'relationship_history')),
  source_count INT NOT NULL DEFAULT 0,
  transferred_count INT NOT NULL DEFAULT 0,
  metadata JSONB NOT NULL DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
