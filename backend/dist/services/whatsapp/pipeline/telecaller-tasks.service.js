import { supabase } from '../../../lib/supabase.js';
export async function createTelecallerTask(params) {
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
                priority: params.priority,
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
                priority: params.priority,
                stage: 'follow_up',
                notes: params.notes?.slice(0, 500) ?? params.title,
            });
        }
    }
}
//# sourceMappingURL=telecaller-tasks.service.js.map