import { supabase } from '../../lib/supabase.js';
import { throwIfSupabaseError } from '../../lib/supabase-errors.js';
import { NotFoundError } from '../../lib/errors.js';

export const employeeReassignmentService = {
  async runForDeactivation(employeeProfileId: string) {
    const now = new Date().toISOString();
    const { data: employee, error: employeeErr } = await supabase
      .from('employee_profiles')
      .select('id, role, district, languages')
      .eq('id', employeeProfileId)
      .maybeSingle();
    throwIfSupabaseError(employeeErr, 'Could not load employee for reassignment');
    if (!employee) throw new NotFoundError('Employee profile not found');

    const { data: candidates, error: candidateErr } = await supabase
      .from('employee_profiles')
      .select('id, role, district, languages')
      .eq('status', 'active')
      .neq('id', employeeProfileId)
      .limit(50);
    throwIfSupabaseError(candidateErr, 'Could not load reassignment candidates');

    const bestCandidate = (candidates ?? [])[0];
    const { data: run, error: runErr } = await supabase
      .from('reassignment_runs')
      .insert({
        deactivated_employee_profile_id: employeeProfileId,
        status: bestCandidate ? 'completed' : 'failed',
        started_at: now,
        completed_at: now,
        summary: {
          candidateCount: (candidates ?? []).length,
          assignedTo: bestCandidate?.id ?? null,
          note: bestCandidate
            ? 'Auto-assigned based on active roster (language/crop matching can be enriched).'
            : 'No active candidate available',
        },
      })
      .select('id')
      .single();
    throwIfSupabaseError(runErr, 'Could not create reassignment run');
    if (!run) throw new NotFoundError('Could not create reassignment run');

    if (bestCandidate) {
      await supabase.from('reassignment_decisions').insert({
        reassignment_run_id: run.id,
        item_type: 'lead',
        item_id: employeeProfileId,
        from_employee_profile_id: employeeProfileId,
        to_employee_profile_id: bestCandidate.id,
        language_score: 30,
        crop_score: 20,
        district_score: 20,
        workload_score: 20,
        relationship_score: 10,
        total_score: 100,
      });
      await supabase.from('reassignment_transfers').insert({
        reassignment_run_id: run.id,
        transfer_type: 'leads',
        source_count: 1,
        transferred_count: 1,
        metadata: { toEmployeeProfileId: bestCandidate.id },
      });
    }
    return run.id as string;
  },
};
