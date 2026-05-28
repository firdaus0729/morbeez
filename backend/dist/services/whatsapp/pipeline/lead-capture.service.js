import { supabase } from '../../../lib/supabase.js';
import { farmerService } from '../../farmer/farmer.service.js';
export const leadCaptureService = {
    async captureAndIdentify(msg, language) {
        const farmer = await farmerService.upsertFromWhatsApp({
            phone: msg.phone,
            name: msg.profileName,
            preferredLanguage: language,
        });
        if (farmer.preferred_language !== language) {
            await supabase
                .from('farmers')
                .update({ preferred_language: language, updated_at: new Date().toISOString() })
                .eq('id', farmer.id);
        }
        const meta = (farmer.metadata ?? {});
        const isPremium = Boolean(meta.premium ?? meta.is_premium);
        const { count: historicalLeadCount } = await supabase
            .from('leads')
            .select('id', { count: 'exact', head: true })
            .eq('farmer_id', farmer.id);
        const hadHistoricalLead = (historicalLeadCount ?? 0) > 0;
        const { data: existingLead } = await supabase
            .from('leads')
            .select('id, notes')
            .eq('farmer_id', farmer.id)
            .eq('source', 'whatsapp')
            .order('updated_at', { ascending: false })
            .limit(1);
        if (!existingLead?.length) {
            await supabase.from('leads').insert({
                farmer_id: farmer.id,
                intent: 'general',
                source: 'whatsapp',
                status: 'new',
                stage: 'new_lead',
                notes: msg.text?.slice(0, 300) || `Inbound ${msg.msgType}`,
                campaign_source: msg.attribution?.campaignSource ?? null,
                referral_source: msg.attribution?.referralSource ?? 'whatsapp',
                affiliate_source: msg.attribution?.affiliateSource ?? null,
                whatsapp_profile_name: msg.profileName ?? null,
                last_interaction_at: new Date().toISOString(),
            });
        }
        else {
            const noteLine = msg.text?.trim() ? `Request: ${msg.text.trim().slice(0, 240)}` : null;
            const mergedNotes = [existingLead[0].notes, noteLine].filter(Boolean).join('\n');
            await supabase
                .from('leads')
                .update({
                last_interaction_at: new Date().toISOString(),
                updated_at: new Date().toISOString(),
                notes: mergedNotes || existingLead[0].notes,
            })
                .eq('id', existingLead[0].id);
        }
        return {
            farmerId: farmer.id,
            phone: msg.phone,
            language,
            isPremium,
            hadHistoricalLead,
        };
    },
};
//# sourceMappingURL=lead-capture.service.js.map