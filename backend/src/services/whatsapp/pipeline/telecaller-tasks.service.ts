import { supabase } from '../../../lib/supabase.js';
import { leadService } from '../../crm/lead.service.js';
import { farmerHealthScoreService } from './farmer-health-score.service.js';

export async function createTelecallerTask(params: {
  farmerId: string;
  title: string;
  notes?: string;
  priority?: 'normal' | 'high' | 'urgent';
  leadId?: string;
}): Promise<void> {
  const dueAt = new Date(Date.now() + 4 * 60 * 60 * 1000).toISOString();

  let effectivePriority = params.priority ?? 'normal';
  if (effectivePriority === 'normal') {
    try {
      const health = await farmerHealthScoreService.compute(params.farmerId);
      if (farmerHealthScoreService.telecallerPriorityFromHealth(health.band) === 'high') {
        effectivePriority = 'high';
      }
    } catch {
      /* non-blocking */
    }
  }

  const healthNote =
    effectivePriority !== (params.priority ?? 'normal')
      ? ' [priority boosted: farmer health at_risk]'
      : '';

  await supabase.from('crm_tasks').insert({
    farmer_id: params.farmerId,
    lead_id: params.leadId ?? null,
    task_type: 'follow_up',
    title: params.title,
    notes: params.notes ? `${params.notes}${healthNote}` : healthNote.trim() || null,
    due_at: dueAt,
    status: 'pending',
  });

  if (effectivePriority === 'urgent' || effectivePriority === 'high') {
    await leadService.ensureLeadForFarmer({
      farmerId: params.farmerId,
      intent: 'callback',
      source: 'whatsapp_escalation',
      status: 'new',
      priority: effectivePriority,
      stage: 'follow_up',
      notes: params.notes?.slice(0, 500) ?? params.title,
      mergeNotes: true,
    });
  }
}
