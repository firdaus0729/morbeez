import { supabase } from '../../lib/supabase.js';
/** Auto-queue when recommendation_count >= threshold for same technical + crop + district */
const GAP_THRESHOLD = 5;
async function findGapRow(technicalName, cropType, district) {
    const { data } = await supabase
        .from('product_gap_queue')
        .select('*')
        .eq('technical_name', technicalName)
        .eq('crop_type', cropType ?? '')
        .eq('district', district ?? '')
        .maybeSingle();
    return data;
}
export const productGapService = {
    async incrementFromRecommendation(params) {
        const name = params.technicalName.trim();
        if (!name.length)
            return;
        const crop = params.cropType?.toLowerCase().trim() ?? '';
        const district = params.district?.trim() ?? '';
        const existing = await findGapRow(name, crop || undefined, district || undefined);
        const samples = Array.isArray(existing?.sample_recommendation_ids)
            ? [...existing.sample_recommendation_ids]
            : [];
        if (params.recommendationRecordId && samples.length < 15 && !samples.includes(params.recommendationRecordId)) {
            samples.push(params.recommendationRecordId);
        }
        const count = (existing?.recommendation_count ?? 0) + 1;
        const urgency = count >= 25 ? 'critical' : count >= 15 ? 'high' : count >= GAP_THRESHOLD ? 'normal' : 'low';
        if (existing) {
            await supabase
                .from('product_gap_queue')
                .update({
                recommendation_count: count,
                crop_subtype: params.cropSubtype ?? existing.crop_subtype ?? null,
                sample_recommendation_ids: samples,
                urgency,
                status: count >= GAP_THRESHOLD ? 'open' : existing.status,
                updated_at: new Date().toISOString(),
            })
                .eq('id', existing.id);
            return;
        }
        await supabase.from('product_gap_queue').insert({
            technical_name: name,
            crop_type: crop || null,
            crop_subtype: params.cropSubtype ?? null,
            district: district || null,
            recommendation_count: count,
            urgency,
            status: count >= GAP_THRESHOLD ? 'open' : 'open',
            sample_recommendation_ids: samples,
        });
    },
    async listOpen(limit = 50) {
        const { data, error } = await supabase
            .from('product_gap_queue')
            .select('*')
            .in('status', ['open', 'reviewing'])
            .gte('recommendation_count', GAP_THRESHOLD)
            .order('recommendation_count', { ascending: false })
            .limit(limit);
        if (error)
            throw error;
        return data ?? [];
    },
};
//# sourceMappingURL=product-gap.service.js.map