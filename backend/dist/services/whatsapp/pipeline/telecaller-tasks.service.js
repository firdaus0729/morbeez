import { supabase } from '../../../lib/supabase.js';
import { farmerHealthScoreService } from './farmer-health-score.service.js';
export async function createTelecallerTask(params) {
    const dueAt = new Date(Date.now() + 4 * 60 * 60 * 1000).toISOString();
    let effectivePriority = params.priority ?? 'normal';
    if (effectivePriority === 'normal') {
        try {
            const health = await farmerHealthScoreService.compute(params.farmerId);
            if (farmerHealthScoreService.telecallerPriorityFromHealth(health.band) === 'high') {
                effectivePriority = 'high';
            }
        }
        catch {
            /* non-blocking */
        }
    }
    const healthNote = effectivePriority !== (params.priority ?? 'normal')
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
        const { data: lead } = await supabase
            .from('leads')
            .select('id, notes')
            .eq('farmer_id', params.farmerId)
            .order('updated_at', { ascending: false })
            .limit(1)
            .maybeSingle();
        if (lead?.id) {
            const mergedNotes = [lead.notes, params.notes?.slice(0, 500) ?? params.title].filter(Boolean).join('\n');
            await supabase
                .from('leads')
                .update({
                priority: effectivePriority,
                stage: 'follow_up',
                notes: mergedNotes,
                updated_at: new Date().toISOString(),
            })
                .eq('id', lead.id);
        }
        else {
            await supabase.from('leads').insert({
                farmer_id: params.farmerId,
                intent: 'callback',
                source: 'whatsapp_escalation',
                status: 'new',
                priority: effectivePriority,
                stage: 'follow_up',
                notes: params.notes?.slice(0, 500) ?? params.title,
            });
        }
    }
}
//# sourceMappingURL=telecaller-tasks.service.js.map