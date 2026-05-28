import { z } from 'zod';
import { assertModuleAccess } from '../../lib/rbac.js';
import { agronomistWorkflowService } from '../../services/admin/agronomist-workflow.service.js';
import { recommendationRecordsService } from '../../services/core/recommendation-records.service.js';
import { recommendationCommunicationService } from '../../services/core/recommendation-communication.service.js';
import { supabase } from '../../lib/supabase.js';
import { throwIfSupabaseError } from '../../lib/supabase-errors.js';
import { recommendationFollowUpService } from '../../services/core/recommendation-follow-up.service.js';
import { crmFarmerService } from '../../services/admin/crm-farmer.service.js';
const draftSchema = z.object({
    findingId: z.string().uuid(),
    farmerId: z.string().uuid(),
    blockId: z.string().uuid().optional(),
    leadId: z.string().uuid().optional(),
    aiSessionId: z.string().uuid().optional(),
    recommendationId: z.string().uuid().optional(),
    issueDetected: z.string().max(500).optional(),
    recommendationText: z.string().min(1).max(8000),
    products: z.array(z.unknown()).optional(),
    dosage: z.string().max(2000).optional(),
    applicationType: z.string().max(120).optional(),
    weatherWarning: z.string().max(500).optional(),
    language: z.enum(['en', 'ml', 'ta', 'kn', 'hi']).optional(),
});
export async function osAgronomistRoutes(app) {
    const api = '/console/api/v1/os/agronomist';
    app.get(`${api}/queue`, async (request, reply) => {
        await assertModuleAccess(request, 'agronomist', 'read');
        const q = request.query;
        const result = await agronomistWorkflowService.listReviewQueue(q.limit ? Number(q.limit) : 40);
        return reply.send({ ok: true, ...result });
    });
    app.get(`${api}/findings/:id`, async (request, reply) => {
        await assertModuleAccess(request, 'agronomist', 'read');
        const { id } = request.params;
        const detail = await agronomistWorkflowService.getFindingDetail(id);
        return reply.send({ ok: true, ...detail });
    });
    app.post(`${api}/findings/:id/ai-suggest`, async (request, reply) => {
        await assertModuleAccess(request, 'agronomist', 'write');
        const { id } = request.params;
        const suggestion = await agronomistWorkflowService.generateAiSuggestion(id);
        return reply.send({ ok: true, ...suggestion });
    });
    app.post(`${api}/drafts`, async (request, reply) => {
        const admin = await assertModuleAccess(request, 'agronomist', 'write');
        const body = draftSchema.parse(request.body);
        const row = await agronomistWorkflowService.saveDraft({
            ...body,
            createdBy: admin.email,
        });
        return reply.send({ ok: true, recommendation: row });
    });
    app.patch(`${api}/drafts/:id`, async (request, reply) => {
        const admin = await assertModuleAccess(request, 'agronomist', 'write');
        const { id } = request.params;
        const body = draftSchema
            .partial()
            .omit({ findingId: true, farmerId: true })
            .extend({ status: z.enum(['draft', 'pending_approval', 'cancelled']).optional() })
            .parse(request.body);
        const updates = {
            updated_at: new Date().toISOString(),
            reviewed_by: admin.email,
        };
        if (body.blockId !== undefined)
            updates.block_id = body.blockId ?? null;
        if (body.leadId !== undefined)
            updates.lead_id = body.leadId ?? null;
        if (body.aiSessionId !== undefined)
            updates.ai_session_id = body.aiSessionId ?? null;
        if (body.recommendationId !== undefined)
            updates.crm_recommendation_id = body.recommendationId ?? null;
        if (body.issueDetected !== undefined)
            updates.issue_detected = body.issueDetected ?? null;
        if (body.recommendationText !== undefined)
            updates.recommendation_text = body.recommendationText;
        if (body.products !== undefined)
            updates.products = body.products;
        if (body.dosage !== undefined)
            updates.dosage = body.dosage ?? null;
        if (body.applicationType !== undefined)
            updates.application_type = body.applicationType ?? null;
        if (body.weatherWarning !== undefined)
            updates.weather_warning = body.weatherWarning ?? null;
        if (body.language !== undefined)
            updates.language = body.language;
        if (body.status !== undefined)
            updates.status = body.status;
        const { data, error } = await supabase
            .from('recommendation_records')
            .update(updates)
            .eq('id', id)
            .eq('source', 'field_finding')
            .select('*')
            .single();
        throwIfSupabaseError(error, 'Could not update draft');
        return reply.send({ ok: true, recommendation: data });
    });
    app.delete(`${api}/drafts/:id`, async (request, reply) => {
        await assertModuleAccess(request, 'agronomist', 'write');
        const { id } = request.params;
        const { error } = await supabase
            .from('recommendation_records')
            .update({ status: 'cancelled', updated_at: new Date().toISOString() })
            .eq('id', id)
            .eq('source', 'field_finding');
        throwIfSupabaseError(error, 'Could not archive draft');
        return reply.send({ ok: true });
    });
    app.post(`${api}/recommendations/:id/submit`, async (request, reply) => {
        const admin = await assertModuleAccess(request, 'agronomist', 'write');
        const { id } = request.params;
        const row = await agronomistWorkflowService.submitForApproval(id, admin.email);
        return reply.send({ ok: true, recommendation: row });
    });
    app.get(`${api}/submissions`, async (request, reply) => {
        await assertModuleAccess(request, 'agronomist', 'read');
        const q = request.query;
        const rows = await agronomistWorkflowService.listAgronomistSubmissions(q.status, q.limit ? Number(q.limit) : 50);
        return reply.send({ ok: true, recommendations: rows });
    });
    app.patch(`${api}/escalations/:id/assign`, async (request, reply) => {
        const admin = await assertModuleAccess(request, 'agronomist', 'write');
        const { id } = request.params;
        const body = z
            .object({
            assignedTo: z.string().min(2).max(120),
            status: z.enum(['assigned', 'in_review']).optional(),
            slaHours: z.number().int().min(1).max(240).optional(),
        })
            .parse(request.body);
        const dueAt = body.slaHours
            ? new Date(Date.now() + body.slaHours * 60 * 60 * 1000).toISOString()
            : null;
        const { data, error } = await supabase
            .from('agronomist_escalations')
            .update({
            assigned_to: body.assignedTo,
            status: body.status ?? 'assigned',
            resolution_eta: dueAt,
            updated_at: new Date().toISOString(),
            metadata: { assignedBy: admin.email, slaHours: body.slaHours ?? null },
        })
            .eq('id', id)
            .select('*')
            .single();
        throwIfSupabaseError(error, 'Could not assign escalation');
        return reply.send({ ok: true, escalation: data });
    });
    app.patch(`${api}/escalations/:id/status`, async (request, reply) => {
        const admin = await assertModuleAccess(request, 'agronomist', 'write');
        const { id } = request.params;
        const body = z
            .object({
            status: z.enum(['pending', 'assigned', 'in_review', 'resolved', 'dismissed']),
            notes: z.string().max(2000).optional(),
        })
            .parse(request.body);
        const patch = {
            status: body.status,
            updated_at: new Date().toISOString(),
            resolution_notes: body.notes ?? null,
            assigned_to: admin.email,
        };
        if (body.status === 'resolved' || body.status === 'dismissed') {
            patch.resolved_at = new Date().toISOString();
        }
        const { data, error } = await supabase
            .from('agronomist_escalations')
            .update(patch)
            .eq('id', id)
            .select('*')
            .single();
        throwIfSupabaseError(error, 'Could not update escalation status');
        return reply.send({ ok: true, escalation: data });
    });
    app.get(`${api}/recommendations/:id`, async (request, reply) => {
        await assertModuleAccess(request, 'agronomist', 'read');
        const { id } = request.params;
        const row = await recommendationRecordsService.getById(id);
        if (!row)
            return reply.code(404).send({ ok: false, message: 'Not found' });
        return reply.send({ ok: true, recommendation: row });
    });
    app.post(`${api}/recommendations/:id/communicate`, async (request, reply) => {
        await assertModuleAccess(request, 'operations', 'write');
        const { id } = request.params;
        const body = z.object({ force: z.boolean().optional() }).parse(request.body ?? {});
        const result = await recommendationCommunicationService.sendApprovedRecommendation(id, {
            force: body.force,
        });
        return reply.send({ ok: true, ...result });
    });
    app.patch(`${api}/recommendations/:id/outcome`, async (request, reply) => {
        await assertModuleAccess(request, 'agronomist', 'write');
        const { id } = request.params;
        const body = z
            .object({
            outcome: z.enum(['better', 'partial', 'no_improvement', 'unknown']),
            outcomeNotes: z.string().max(2000).optional(),
        })
            .parse(request.body);
        const { data, error } = await supabase
            .from('recommendation_records')
            .update({
            status: 'outcome_recorded',
            outcome: body.outcome,
            outcome_notes: body.outcomeNotes ?? null,
            outcome_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
        })
            .eq('id', id)
            .select('*')
            .single();
        throwIfSupabaseError(error, 'Could not record outcome');
        return reply.send({ ok: true, recommendation: data });
    });
    /** Full treatment timeline for agronomist review (recommendations + applications + visits). */
    app.get(`${api}/farmers/:farmerId/blocks/:blockId/timeline`, async (request, reply) => {
        await assertModuleAccess(request, 'agronomist', 'read');
        const { farmerId, blockId } = request.params;
        const [timeline, followUpRecs] = await Promise.all([
            crmFarmerService.blockTimeline(farmerId, blockId),
            recommendationFollowUpService.buildBlockTimelineEvents(blockId, farmerId),
        ]);
        const { data: applications } = await supabase
            .from('recommendation_applications')
            .select('*')
            .eq('farmer_id', farmerId)
            .eq('block_id', blockId)
            .order('applied_at', { ascending: false });
        const { data: recs } = await supabase
            .from('recommendation_records')
            .select('*')
            .eq('farmer_id', farmerId)
            .eq('block_id', blockId)
            .order('created_at', { ascending: false })
            .limit(20);
        return reply.send({
            ok: true,
            timeline,
            recommendationRecords: recs ?? [],
            applications: applications ?? [],
            events: followUpRecs,
        });
    });
}
//# sourceMappingURL=os-agronomist.routes.js.map