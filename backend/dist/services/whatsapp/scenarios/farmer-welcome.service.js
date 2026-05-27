import { supabase } from '../../../lib/supabase.js';
import { fetchCompactFarmerContext } from '../pipeline/advisory-context.service.js';
import { t } from './whatsapp-flow-copy.js';
/** Scenario 11 — returning farmer context line. */
export const farmerWelcomeService = {
    async buildWelcomeLine(farmerId, language) {
        const { count } = await supabase
            .from('ai_advisory_sessions')
            .select('id', { count: 'exact', head: true })
            .eq('farmer_id', farmerId);
        if (!count || count < 1)
            return null;
        const ctx = await fetchCompactFarmerContext(farmerId);
        const crop = ctx.cropType.charAt(0).toUpperCase() + ctx.cropType.slice(1);
        const stage = ctx.cropStage ? ` — ${ctx.cropStage}` : '';
        const dapLine = ctx.dap && ctx.dap > 0 && ctx.dap < 400 ? `\n${crop} — ${ctx.dap} DAP` : '';
        const risk = ctx.recentIssues !== 'none'
            ? '\n\n⚠️ Recent issues on record — send an updated photo.'
            : '\n\nSend a crop photo or describe symptoms.';
        return `${t('welcomeBack', language)}${dapLine || `\n${crop}${stage}`}${risk}`;
    },
};
//# sourceMappingURL=farmer-welcome.service.js.map