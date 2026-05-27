import { supabase } from '../../../lib/supabase.js';
import { fetchCompactFarmerContext } from '../pipeline/advisory-context.service.js';
import { t } from './whatsapp-flow-copy.js';
import type { AdvisoryLanguage } from '../../ai/types.js';

/** Scenario 11 — returning farmer context line. */
export const farmerWelcomeService = {
  async buildWelcomeLine(farmerId: string, language: AdvisoryLanguage): Promise<string | null> {
    const { count } = await supabase
      .from('ai_advisory_sessions')
      .select('id', { count: 'exact', head: true })
      .eq('farmer_id', farmerId);

    if (!count || count < 1) return null;

    const ctx = await fetchCompactFarmerContext(farmerId);
    const crop = ctx.cropType.charAt(0).toUpperCase() + ctx.cropType.slice(1);
    const stage = ctx.cropStage ? ` — ${ctx.cropStage}` : '';

    let dapLine = '';
    const { data: cropRow } = await supabase
      .from('farmer_crops')
      .select('stage, created_at')
      .eq('farmer_id', farmerId)
      .eq('is_primary', true)
      .maybeSingle();

    if (cropRow?.created_at) {
      const planted = new Date(cropRow.created_at);
      const dap = Math.floor((Date.now() - planted.getTime()) / (24 * 60 * 60 * 1000));
      if (dap > 0 && dap < 400) dapLine = `\n${crop} — ${dap} DAP`;
    }

    const risk =
      ctx.recentIssues !== 'none'
        ? '\n\n⚠️ Recent issues on record — send an updated photo.'
        : '\n\nSend a crop photo or describe symptoms.';

    return `${t('welcomeBack', language)}${dapLine || `\n${crop}${stage}`}${risk}`;
  },
};
