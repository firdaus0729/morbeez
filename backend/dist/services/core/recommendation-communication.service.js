import { supabase } from '../../lib/supabase.js';
import { throwIfSupabaseError } from '../../lib/supabase-errors.js';
import { NotFoundError, AppError } from '../../lib/errors.js';
import { whatsappService } from '../whatsapp/whatsapp.service.js';
import { env } from '../../config/env.js';
function pickSummary(text) {
    return text.trim();
}
export function buildApprovedRecommendationMessage(row) {
    const lines = [
        '🌾 *Morbeez — Approved recommendation*',
        '',
        row.issue_detected ? `*Issue:* ${row.issue_detected}` : null,
        `*Advice:* ${pickSummary(row.recommendation_text)}`,
        row.dosage ? `*Dosage:* ${row.dosage}` : null,
        row.application_type ? `*Application:* ${row.application_type}` : null,
        row.weather_warning ? `⚠️ ${row.weather_warning}` : null,
        '',
        '_Approved by Morbeez agronomy team. Reply if you need help applying this._',
    ].filter(Boolean);
    return lines.join('\n');
}
export const recommendationCommunicationService = {
    async sendApprovedRecommendation(recommendationId, options) {
        const { data, error } = await supabase
            .from('recommendation_records')
            .select('id, farmer_id, issue_detected, recommendation_text, dosage, application_type, weather_warning, language, status, communicated_at, metadata, farmers(phone, name, preferred_language)')
            .eq('id', recommendationId)
            .single();
        throwIfSupabaseError(error, 'Could not load recommendation');
        if (!data)
            throw new NotFoundError('Recommendation not found');
        const raw = data;
        const farmersRel = raw.farmers;
        const farmerObj = Array.isArray(farmersRel) ? farmersRel[0] : farmersRel;
        const row = {
            ...raw,
            farmers: farmerObj,
        };
        const allowed = ['approved', 'communicated'];
        if (!allowed.includes(row.status)) {
            throw new AppError('Recommendation must be approved before sending', 400, 'INVALID_STATUS');
        }
        if (row.communicated_at && !options?.force) {
            return { sent: false, reason: 'already_communicated' };
        }
        const phone = row.farmers?.phone;
        if (!phone?.trim()) {
            return { sent: false, reason: 'no_phone' };
        }
        if (!env.WHATSAPP_ACCESS_TOKEN && env.WHATSAPP_PROVIDER === 'cloud') {
            return { sent: false, reason: 'whatsapp_not_configured' };
        }
        const text = buildApprovedRecommendationMessage(row);
        await whatsappService.sendText(phone, text.slice(0, 4000));
        const now = new Date().toISOString();
        const { error: updErr } = await supabase
            .from('recommendation_records')
            .update({
            status: 'communicated',
            communicated_at: now,
            updated_at: now,
            metadata: { ...(row.metadata ?? {}), whatsapp_sent_at: now },
        })
            .eq('id', recommendationId);
        throwIfSupabaseError(updErr, 'Could not mark recommendation communicated');
        if (env.ENABLE_ADVISORY_FOLLOW_UPS) {
            await supabase.from('advisory_automation_jobs').insert({
                farmer_id: row.farmer_id,
                job_type: 'whatsapp_follow_up',
                scheduled_at: new Date(Date.now() + 3 * 24 * 60 * 60 * 1000).toISOString(),
                payload: { recommendationRecordId: recommendationId, language: row.language },
            });
        }
        return { sent: true, message: text };
    },
};
//# sourceMappingURL=recommendation-communication.service.js.map