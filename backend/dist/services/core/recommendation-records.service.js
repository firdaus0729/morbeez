import { supabase } from '../../lib/supabase.js';
import { throwIfSupabaseError } from '../../lib/supabase-errors.js';
import { AppError } from '../../lib/errors.js';
import { blockService } from './block.service.js';
import { productGapService } from './product-gap.service.js';
async function districtForFarmer(farmerId, blockId) {
    if (blockId) {
        const block = await blockService.getById(blockId, farmerId);
        if (block?.pincode_id) {
            const { data } = await supabase
                .from('pincode_master')
                .select('district')
                .eq('id', block.pincode_id)
                .maybeSingle();
            if (data?.district)
                return String(data.district);
        }
    }
    const { data } = await supabase.from('farmers').select('district').eq('id', farmerId).maybeSingle();
    return data?.district ? String(data.district) : undefined;
}
export const recommendationRecordsService = {
    async create(input) {
        let dap = null;
        let cropType;
        if (input.blockId) {
            const block = await blockService.getById(input.blockId, input.farmerId);
            if (block) {
                dap = block.dap;
                cropType = block.crop_type;
            }
        }
        const status = input.status ?? (input.source === 'agronomist' ? 'pending_approval' : 'draft');
        const { data, error } = await supabase
            .from('recommendation_records')
            .insert({
            farmer_id: input.farmerId,
            block_id: input.blockId ?? null,
            lead_id: input.leadId ?? null,
            ai_session_id: input.aiSessionId ?? null,
            crm_recommendation_id: input.crmRecommendationId ?? null,
            field_finding_id: input.fieldFindingId ?? null,
            source: input.source,
            issue_detected: input.issueDetected ?? null,
            recommendation_text: input.recommendationText,
            products: input.products ?? [],
            dosage: input.dosage ?? null,
            application_type: input.applicationType ?? null,
            weather_warning: input.weatherWarning ?? null,
            dap_at_recommendation: dap,
            language: input.language ?? 'en',
            status,
            created_by: input.createdBy ?? null,
        })
            .select('*')
            .single();
        throwIfSupabaseError(error, 'Could not create recommendation record');
        const dist = await districtForFarmer(input.farmerId, input.blockId);
        const recordId = String(data.id);
        for (const p of input.products ?? []) {
            const title = typeof p === 'object' && p && 'productTitle' in p
                ? String(p.productTitle)
                : typeof p === 'string'
                    ? p
                    : null;
            if (title) {
                await productGapService.incrementFromRecommendation({
                    technicalName: title,
                    cropType,
                    district: dist,
                    recommendationRecordId: recordId,
                });
            }
        }
        return data;
    },
    async submitForApproval(id, reviewedBy) {
        const { data, error } = await supabase
            .from('recommendation_records')
            .update({
            status: 'pending_approval',
            reviewed_by: reviewedBy ?? null,
            updated_at: new Date().toISOString(),
        })
            .eq('id', id)
            .select('*')
            .single();
        throwIfSupabaseError(error, 'Could not submit recommendation');
        return data;
    },
    async approve(id, approvedBy) {
        const { data, error } = await supabase
            .from('recommendation_records')
            .update({
            status: 'approved',
            approved_by: approvedBy,
            approved_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
        })
            .eq('id', id)
            .eq('status', 'pending_approval')
            .select('*')
            .single();
        throwIfSupabaseError(error, 'Could not approve recommendation');
        return data;
    },
    async reject(id, approvedBy, notes) {
        const { data, error } = await supabase
            .from('recommendation_records')
            .update({
            status: 'rejected',
            approved_by: approvedBy,
            outcome_notes: notes ?? null,
            updated_at: new Date().toISOString(),
        })
            .eq('id', id)
            .select('*')
            .single();
        throwIfSupabaseError(error, 'Could not reject recommendation');
        return data;
    },
    async recordOutcome(id, outcome, notes) {
        const { data, error } = await supabase
            .from('recommendation_records')
            .update({
            status: 'outcome_recorded',
            outcome,
            outcome_notes: notes ?? null,
            outcome_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
        })
            .eq('id', id)
            .select('*')
            .single();
        throwIfSupabaseError(error, 'Could not record outcome');
        return data;
    },
    async listPendingApproval(limit = 50) {
        const { data, error } = await supabase
            .from('recommendation_records')
            .select('*, farmers(name, phone), farm_blocks(name, crop_type, plot_label)')
            .eq('status', 'pending_approval')
            .order('created_at', { ascending: false })
            .limit(limit);
        throwIfSupabaseError(error, 'Could not load pending recommendations');
        return data ?? [];
    },
    async getById(id) {
        const { data, error } = await supabase
            .from('recommendation_records')
            .select('*, farmers(name, phone, preferred_language), farm_blocks(name, crop_type, plot_label)')
            .eq('id', id)
            .maybeSingle();
        throwIfSupabaseError(error, 'Could not load recommendation');
        return data;
    },
    async updateDraft(id, patch) {
        const { data: existing } = await supabase
            .from('recommendation_records')
            .select('status')
            .eq('id', id)
            .maybeSingle();
        if (!existing || existing.status !== 'draft') {
            throw new AppError('Only draft recommendations can be edited', 400, 'INVALID_STATUS');
        }
        const { data, error } = await supabase
            .from('recommendation_records')
            .update({
            ...(patch.issueDetected !== undefined ? { issue_detected: patch.issueDetected } : {}),
            ...(patch.recommendationText !== undefined
                ? { recommendation_text: patch.recommendationText }
                : {}),
            ...(patch.products !== undefined ? { products: patch.products } : {}),
            ...(patch.dosage !== undefined ? { dosage: patch.dosage } : {}),
            ...(patch.applicationType !== undefined ? { application_type: patch.applicationType } : {}),
            ...(patch.weatherWarning !== undefined ? { weather_warning: patch.weatherWarning } : {}),
            ...(patch.language !== undefined ? { language: patch.language } : {}),
            ...(patch.blockId !== undefined ? { block_id: patch.blockId } : {}),
            updated_at: new Date().toISOString(),
        })
            .eq('id', id)
            .eq('status', 'draft')
            .select('*')
            .single();
        throwIfSupabaseError(error, 'Could not update recommendation');
        return data;
    },
    async listByStatus(status, limit = 50) {
        const statuses = Array.isArray(status) ? status : [status];
        const { data, error } = await supabase
            .from('recommendation_records')
            .select('*, farmers(name, phone), farm_blocks(name, crop_type, plot_label)')
            .in('status', statuses)
            .order('created_at', { ascending: false })
            .limit(limit);
        throwIfSupabaseError(error, 'Could not load recommendations');
        return data ?? [];
    },
    async listByFarmer(farmerId, limit = 30) {
        const { data, error } = await supabase
            .from('recommendation_records')
            .select('*')
            .eq('farmer_id', farmerId)
            .order('created_at', { ascending: false })
            .limit(limit);
        throwIfSupabaseError(error, 'Could not load recommendations');
        return data ?? [];
    },
};
//# sourceMappingURL=recommendation-records.service.js.map