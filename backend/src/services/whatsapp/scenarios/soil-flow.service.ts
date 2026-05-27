import { supabase } from '../../../lib/supabase.js';
import { createTelecallerTask } from '../pipeline/telecaller-tasks.service.js';
import { t } from './whatsapp-flow-copy.js';
import type { AdvisoryLanguage } from '../../ai/types.js';

type SoilMenuList = {
  body: string;
  buttonText: string;
  sections: Array<{
    title: string;
    rows: Array<{ id: string; title: string; description?: string }>;
  }>;
};

/** Scenarios 12–14, 43 — soil testing flows. */
export const soilFlowService = {
  soilMenuList(language: AdvisoryLanguage): SoilMenuList {
    return {
      body: t('soilMenu', language),
      buttonText: language === 'ml' ? 'തിരഞ്ഞെടുക്കുക' : 'Choose',
      sections: [
        {
          title: 'Soil',
          rows: [
            { id: 'soil.upload', title: 'Upload Report', description: 'PDF or photo' },
            { id: 'soil.testing', title: 'Soil Testing', description: 'Request collection' },
            { id: 'soil.address', title: 'Send Address', description: 'Sample drop point' },
            { id: 'soil.expert', title: 'Expert Help', description: 'Talk to agronomist' },
          ],
        },
      ],
    };
  },

  async hasSoilReport(farmerId: string): Promise<boolean> {
    const { data: farmer } = await supabase
      .from('farmers')
      .select('metadata')
      .eq('id', farmerId)
      .maybeSingle();
    const meta = (farmer?.metadata ?? {}) as Record<string, unknown>;
    if (meta.soil_report_uploaded || meta.soil_report_at) return true;

    const { count } = await supabase
      .from('crm_field_findings')
      .select('id', { count: 'exact', head: true })
      .eq('farmer_id', farmerId)
      .or('observations.ilike.%soil%,disease_pest.ilike.%soil%');
    return (count ?? 0) > 0;
  },

  async handleLowYieldWithoutReport(
    _farmerId: string,
    language: AdvisoryLanguage
  ): Promise<{ body: string; list: SoilMenuList }> {
    return {
      body: t('noSoilReport', language),
      list: this.soilMenuList(language),
    };
  },

  addressReply(language: AdvisoryLanguage): string {
    return t('soilAddress', language);
  },

  async requestSoilTesting(farmerId: string, language: AdvisoryLanguage): Promise<string> {
    await createTelecallerTask({
      farmerId,
      title: 'Soil testing request (WhatsApp)',
      notes: `Language: ${language}`,
      priority: 'normal',
    });
    await supabase.from('callback_requests').insert({
      farmer_id: farmerId,
      preferred_time: 'any',
      status: 'pending',
      telecaller_notes: 'Soil testing — WhatsApp menu',
    });
    return 'Soil testing request received.\n\nOur team will contact you for sample collection.';
  },

  reportReceivedReply(language: AdvisoryLanguage): string {
    return t('soilReportReceived', language);
  },
};
