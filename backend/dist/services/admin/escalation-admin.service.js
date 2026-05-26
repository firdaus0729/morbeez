import { supabase } from '../../lib/supabase.js';
import { throwIfSupabaseError } from '../../lib/supabase-errors.js';
import { NotFoundError } from '../../lib/errors.js';
function formatDt(iso) {
    if (!iso)
        return null;
    try {
        return new Date(iso).toLocaleString('en-IN', {
            day: 'numeric',
            month: 'short',
            year: 'numeric',
            hour: 'numeric',
            minute: '2-digit',
            hour12: true,
        });
    }
    catch {
        return iso;
    }
}
function normalizeJoinRow(raw) {
    if (!raw)
        return null;
    if (Array.isArray(raw))
        return raw[0] ?? null;
    return raw;
}
function farmerDisplayName(row) {
    if (!row)
        return 'Farmer';
    const first = String(row.first_name ?? '').trim();
    const last = String(row.last_name ?? '').trim();
    const combined = [first, last].filter(Boolean).join(' ');
    return combined || String(row.name ?? '').trim() || 'Farmer';
}
export const escalationAdminService = {
    async list(params) {
        const page = params.page ?? 1;
        const limit = Math.min(params.limit ?? 20, 50);
        const from = (page - 1) * limit;
        let query = supabase
            .from('agronomist_escalations')
            .select(`id, session_id, farmer_id, reason, confidence_at_escalation, priority, status, assigned_to, created_at, updated_at,
         farmers(id, phone, name, first_name, last_name, district, preferred_language),
         ai_advisory_sessions(crop_type, crop_stage, language, symptoms_text, voice_transcript)`, { count: 'exact' })
            .order('created_at', { ascending: false })
            .range(from, from + limit - 1);
        if (params.status && params.status !== 'all') {
            query = query.eq('status', params.status);
        }
        const { data, error, count } = await query;
        throwIfSupabaseError(error, 'Could not list escalations');
        const items = (data ?? []).map((row) => {
            const farmer = normalizeJoinRow(row.farmers);
            const session = normalizeJoinRow(row.ai_advisory_sessions);
            return {
                id: row.id,
                sessionId: row.session_id,
                farmerId: row.farmer_id,
                farmerName: farmerDisplayName(farmer),
                farmerPhone: farmer?.phone ?? null,
                cropType: session?.crop_type ?? null,
                language: session?.language ?? farmer?.preferred_language ?? 'en',
                reason: row.reason,
                confidence: row.confidence_at_escalation,
                priority: row.priority,
                status: row.status,
                assignedTo: row.assigned_to,
                createdAt: row.created_at,
                createdLabel: formatDt(row.created_at),
            };
        });
        return { items, total: count ?? 0, page, limit };
    },
    async getById(id) {
        const { data, error } = await supabase
            .from('agronomist_escalations')
            .select(`*, farmers(*), ai_advisory_sessions(*, ai_advisory_outputs(*), ai_product_recommendations(*))`)
            .eq('id', id)
            .single();
        if (error || !data)
            throw new NotFoundError('Escalation not found');
        const farmer = normalizeJoinRow(data.farmers);
        const session = normalizeJoinRow(data.ai_advisory_sessions);
        const outputs = session?.ai_advisory_outputs ?? [];
        const latestOutput = outputs[0];
        const recs = session?.ai_product_recommendations ?? [];
        return {
            id: data.id,
            sessionId: data.session_id,
            farmerId: data.farmer_id,
            farmer: farmer
                ? {
                    id: farmer.id,
                    name: farmerDisplayName(farmer),
                    phone: farmer.phone,
                    district: farmer.district,
                    language: farmer.preferred_language,
                }
                : null,
            reason: data.reason,
            confidence: data.confidence_at_escalation,
            priority: data.priority,
            status: data.status,
            assignedTo: data.assigned_to,
            agronomistNotes: data.agronomist_notes,
            resolution: data.resolution,
            correction: data.correction,
            resolvedAt: data.resolved_at,
            createdAt: data.created_at,
            createdLabel: formatDt(data.created_at),
            session: session
                ? {
                    cropType: session.crop_type,
                    cropStage: session.crop_stage,
                    symptomsText: session.symptoms_text,
                    voiceTranscript: session.voice_transcript,
                    summaryEn: latestOutput?.farmer_summary_en,
                    summaryMl: latestOutput?.farmer_summary_ml,
                    probableIssue: latestOutput?.probable_issue,
                    treatments: latestOutput?.treatment_recommendations,
                    precautions: latestOutput?.precautions,
                }
                : null,
            productRecommendations: recs.map((r) => {
                const rec = r;
                return {
                    title: rec.product_title,
                    reason: rec.reason,
                    handle: rec.shopify_product_handle,
                };
            }),
        };
    },
    async update(id, body, agentEmail) {
        const patch = {
            updated_at: new Date().toISOString(),
        };
        if (body.status)
            patch.status = body.status;
        if (body.assignedTo !== undefined)
            patch.assigned_to = body.assignedTo || agentEmail;
        if (body.agronomistNotes !== undefined)
            patch.agronomist_notes = body.agronomistNotes;
        if (body.resolution !== undefined)
            patch.resolution = body.resolution;
        if (body.correction !== undefined)
            patch.correction = body.correction;
        if (body.status === 'resolved' || body.status === 'closed') {
            patch.resolved_at = new Date().toISOString();
        }
        const { data, error } = await supabase
            .from('agronomist_escalations')
            .update(patch)
            .eq('id', id)
            .select()
            .single();
        throwIfSupabaseError(error, 'Could not update escalation');
        if (!data)
            throw new NotFoundError('Escalation not found');
        if (body.agronomistNotes?.trim()) {
            await supabase.from('telecaller_notes').insert({
                farmer_id: data.farmer_id,
                session_id: data.session_id,
                escalation_id: id,
                author: agentEmail,
                note: body.agronomistNotes,
            });
        }
        return this.getById(id);
    },
    async countPending() {
        const { count } = await supabase
            .from('agronomist_escalations')
            .select('id', { count: 'exact', head: true })
            .in('status', ['pending', 'assigned', 'in_review']);
        return count ?? 0;
    },
};
//# sourceMappingURL=escalation-admin.service.js.map