import { supabase } from '../../../lib/supabase.js';
import { farmerService } from '../../farmer/farmer.service.js';
export const leadCaptureService = {
    async captureAndIdentify(msg, language) {
        const farmer = await farmerService.upsertByPhone({
            phone: msg.phone,
            name: msg.profileName,
            preferredLanguage: language,
            source: 'whatsapp',
        });
        if (farmer.preferred_language !== language) {
            await supabase
                .from('farmers')
                .update({ preferred_language: language, updated_at: new Date().toISOString() })
                .eq('id', farmer.id);
        }
        const meta = (farmer.metadata ?? {});
        const isPremium = Boolean(meta.premium ?? meta.is_premium);
        const since = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
        const { data: recentLead } = await supabase
            .from('leads')
            .select('id')
            .eq('farmer_id', farmer.id)
            .eq('source', 'whatsapp')
            .gte('created_at', since)
            .limit(1);
        if (!recentLead?.length) {
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
            await supabase
                .from('leads')
                .update({ last_interaction_at: new Date().toISOString() })
                .eq('id', recentLead[0].id);
        }
        return {
            farmerId: farmer.id,
            phone: msg.phone,
            language,
            isPremium,
        };
    },
};
//# sourceMappingURL=lead-capture.service.js.map