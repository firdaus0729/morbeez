import { supabase } from '../../../lib/supabase.js';
import { leadService } from '../../crm/lead.service.js';
import { farmerService } from '../../farmer/farmer.service.js';
import type { InboundMessage } from './types.js';
import type { AdvisoryLanguage } from '../../ai/types.js';

export const leadCaptureService = {
  async captureAndIdentify(msg: InboundMessage, language: AdvisoryLanguage) {
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

    const meta = (farmer.metadata ?? {}) as Record<string, unknown>;
    const isPremium = Boolean(meta.premium ?? meta.is_premium);
    const { count: historicalLeadCount } = await supabase
      .from('leads')
      .select('id', { count: 'exact', head: true })
      .eq('farmer_id', farmer.id);
    const hadHistoricalLead = (historicalLeadCount ?? 0) > 0;

    await leadService.ensureLeadForFarmer({
      farmerId: farmer.id,
      intent: 'general',
      source: 'whatsapp',
      status: 'new',
      stage: 'new_lead',
      notes: msg.text?.slice(0, 300) || `Inbound ${msg.msgType}`,
      mergeNotes: true,
      campaign_source: msg.attribution?.campaignSource ?? null,
      referral_source: msg.attribution?.referralSource ?? 'whatsapp',
      affiliate_source: msg.attribution?.affiliateSource ?? null,
      whatsapp_profile_name: msg.profileName ?? null,
    });

    return {
      farmerId: farmer.id,
      phone: msg.phone,
      language,
      isPremium,
      hadHistoricalLead,
    };
  },
};
