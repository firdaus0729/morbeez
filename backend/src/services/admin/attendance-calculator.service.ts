import { supabase } from '../../lib/supabase.js';
import { throwIfSupabaseError } from '../../lib/supabase-errors.js';

export const attendanceCalculatorService = {
  async recomputeDaily(employeeProfileId: string, date: string) {
    const { data: logs, error } = await supabase
      .from('activity_evidence_logs')
      .select('*')
      .eq('employee_profile_id', employeeProfileId)
      .eq('event_date', date);
    throwIfSupabaseError(error, 'Could not load activity logs');

    const activeMinutes = (logs ?? []).reduce((sum, row) => sum + Number(row.active_minutes ?? 0), 0);
    const calls = (logs ?? [])
      .filter((row) => row.event_type === 'call')
      .reduce((sum, row) => sum + Number(row.event_count ?? 0), 0);
    const whatsapp = (logs ?? [])
      .filter((row) => row.event_type === 'whatsapp')
      .reduce((sum, row) => sum + Number(row.event_count ?? 0), 0);
    const updates = (logs ?? [])
      .filter((row) => row.event_type === 'crm_update')
      .reduce((sum, row) => sum + Number(row.event_count ?? 0), 0);

    const hours = activeMinutes / 60;
    const status = hours >= 9 ? 'full_day' : hours >= 6 ? 'half_day' : 'absent';
    const { data, error: upsertErr } = await supabase
      .from('attendance_daily')
      .upsert({
        employee_profile_id: employeeProfileId,
        attendance_date: date,
        total_active_minutes: activeMinutes,
        total_calls: calls,
        total_whatsapp_events: whatsapp,
        total_crm_updates: updates,
        day_status: status,
        idle_warning_triggered: activeMinutes > 0 && activeMinutes < 45,
        updated_at: new Date().toISOString(),
      })
      .select('*')
      .single();
    throwIfSupabaseError(upsertErr, 'Could not upsert attendance');
    return data;
  },

  async summarizeMonth(employeeProfileId: string, year: number, month: number) {
    const start = new Date(Date.UTC(year, month - 1, 1)).toISOString().slice(0, 10);
    const end = new Date(Date.UTC(year, month, 0)).toISOString().slice(0, 10);
    const { data, error } = await supabase
      .from('attendance_daily')
      .select('day_status')
      .eq('employee_profile_id', employeeProfileId)
      .gte('attendance_date', start)
      .lte('attendance_date', end);
    throwIfSupabaseError(error, 'Could not load attendance month');
    const fullDays = (data ?? []).filter((r) => r.day_status === 'full_day').length;
    const halfDays = (data ?? []).filter((r) => r.day_status === 'half_day').length;
    const absentDays = (data ?? []).filter((r) => r.day_status === 'absent').length;
    const workedDays = fullDays + halfDays * 0.5;
    const salaryEligibility = workedDays >= 23;
    const { data: summary, error: upsertErr } = await supabase
      .from('attendance_monthly_summary')
      .upsert({
        employee_profile_id: employeeProfileId,
        year,
        month,
        full_days: fullDays,
        half_days: halfDays,
        absent_days: absentDays,
        worked_days: workedDays,
        salary_eligibility: salaryEligibility,
        updated_at: new Date().toISOString(),
      })
      .select('*')
      .single();
    throwIfSupabaseError(upsertErr, 'Could not save attendance summary');
    return summary;
  },
};
