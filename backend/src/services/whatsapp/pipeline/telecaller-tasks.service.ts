import { supabase } from '../../../lib/supabase.js';

export async function createTelecallerTask(params: {
  farmerId: string;
  title: string;
  notes?: string;
  priority?: 'normal' | 'high' | 'urgent';
  leadId?: string;
}): Promise<void> {
  const dueAt = new Date(Date.now() + 4 * 60 * 60 * 1000).toISOString();

  await supabase.from('crm_tasks').insert({
    farmer_id: params.farmerId,
    lead_id: params.leadId ?? null,
    task_type: 'follow_up',
    title: params.title,
    notes: params.notes ?? null,
    due_at: dueAt,
    status: 'pending',
  });

  if (params.priority === 'urgent' || params.priority === 'high') {
    await supabase.from('leads').insert({
      farmer_id: params.farmerId,
      intent: 'callback',
      source: 'whatsapp_escalation',
      status: 'new',
      priority: params.priority,
      stage: 'follow_up',
      notes: params.notes?.slice(0, 500) ?? params.title,
    });
  }
}
