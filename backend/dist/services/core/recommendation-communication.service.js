import { supabase } from '../../lib/supabase.js';
import { throwIfSupabaseError } from '../../lib/supabase-errors.js';
import { NotFoundError, AppError } from '../../lib/errors.js';
import { whatsappService } from '../whatsapp/whatsapp.service.js';
import { env } from '../../config/env.js';
import { recommendationFollowUpService } from './recommendation-follow-up.service.js';
function pickSummary(text) {
    return text.trim();
}
export function buildApprovedRecommendationMessage(row) {
    const lang = String(row.language || row.farmers?.preferred_language || 'en').toLowerCase();
    const copy = {
        en: {
            title: '🌾 *Morbeez — Approved recommendation*',
            issue: '*Issue:*',
            advice: '*Advice:*',
            dosage: '*Dosage:*',
            app: '*Application:*',
            footer: '_Approved by Morbeez agronomy team. Reply if you need help applying this._',
        },
        ml: {
            title: '🌾 *മോർബീസ് — അംഗീകരിച്ച ശുപാർശ*',
            issue: '*പ്രശ്നം:*',
            advice: '*ശുപാർശ:*',
            dosage: '*ഡോസേജ്:*',
            app: '*പ്രയോഗം:*',
            footer: '_മോർബീസ് അഗ്രോണമി ടീം അംഗീകരിച്ചത്. സഹായം വേണമെങ്കിൽ മറുപടി നൽകുക._',
        },
        ta: {
            title: '🌾 *மோர்பீஸ் — அங்கீகரிக்கப்பட்ட பரிந்துரை*',
            issue: '*பிரச்சனை:*',
            advice: '*பரிந்துரை:*',
            dosage: '*அளவு:*',
            app: '*பயன்பாடு:*',
            footer: '_மோர்பீஸ் குழுவால் அங்கீகரிக்கப்பட்டது. உதவி வேண்டுமெனில் பதிலளிக்கவும்._',
        },
        kn: {
            title: '🌾 *ಮೋರ್ಬೀಸ್ — ಅನುಮೋದಿತ ಶಿಫಾರಸು*',
            issue: '*ಸಮಸ್ಯೆ:*',
            advice: '*ಶಿಫಾರಸು:*',
            dosage: '*ಡೋಸೇಜ್:*',
            app: '*ಅನ್ವಯಿಕೆ:*',
            footer: '_ಮೋರ್ಬೀಸ್ ತಂಡದಿಂದ ಅನುಮೋದಿಸಲಾಗಿದೆ. ಸಹಾಯ ಬೇಕಾದರೆ ಪ್ರತಿಕ್ರಿಯಿಸಿ._',
        },
        hi: {
            title: '🌾 *मॉर्बीज़ — स्वीकृत सलाह*',
            issue: '*समस्या:*',
            advice: '*सलाह:*',
            dosage: '*डोसेज:*',
            app: '*उपयोग:*',
            footer: '_मॉर्बीज़ एग्रोनॉमी टीम द्वारा स्वीकृत। मदद चाहिए तो जवाब दें।_',
        },
    };
    const t = copy[lang] ?? copy.en;
    const lines = [
        t.title,
        '',
        row.issue_detected ? `${t.issue} ${row.issue_detected}` : null,
        `${t.advice} ${pickSummary(row.recommendation_text)}`,
        row.dosage ? `${t.dosage} ${row.dosage}` : null,
        row.application_type ? `${t.app} ${row.application_type}` : null,
        row.weather_warning ? `⚠️ ${row.weather_warning}` : null,
        '',
        t.footer,
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
        await recommendationFollowUpService.onRecommendationCommunicated(recommendationId);
        return { sent: true, message: text };
    },
};
//# sourceMappingURL=recommendation-communication.service.js.map