import { supabase } from '../../../lib/supabase.js';
import { leadService } from '../../crm/lead.service.js';
import { createTelecallerTask } from '../pipeline/telecaller-tasks.service.js';
import { t } from './whatsapp-flow-copy.js';
import type { AdvisoryLanguage } from '../../ai/types.js';

/** Scenario 20 — callback request. */
export const callbackFlowService = {
  async createCallback(farmerId: string, language: AdvisoryLanguage, notes?: string): Promise<string> {
    const { data: farmer } = await supabase
      .from('farmers')
      .select('district, preferred_language')
      .eq('id', farmerId)
      .maybeSingle();

    await supabase.from('callback_requests').insert({
      farmer_id: farmerId,
      preferred_time: 'any',
      status: 'pending',
      telecaller_notes: notes?.slice(0, 500) ?? `WhatsApp callback (${language})`,
    });

    await createTelecallerTask({
      farmerId,
      title: 'WhatsApp callback requested',
      notes: `District: ${farmer?.district ?? 'unknown'} | ${notes ?? ''}`,
      priority: 'high',
    });

    await leadService.ensureLeadForFarmer({
      farmerId,
      intent: 'callback',
      source: 'whatsapp',
      status: 'new',
      priority: 'high',
      stage: 'follow_up',
      notes: notes?.slice(0, 500) ?? 'Callback from WhatsApp menu',
      mergeNotes: true,
    });

    return t('callbackReceived', language);
  },
};
