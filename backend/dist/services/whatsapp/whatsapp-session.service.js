import { supabase } from '../../lib/supabase.js';
import { env } from '../../config/env.js';
const SESSION_MS = env.WHATSAPP_SESSION_HOURS * 60 * 60 * 1000;
/** Farmer messaged business within WhatsApp 24h care window → session (free-text) allowed */
export const whatsappSessionService = {
    async hasActiveInboundSession(farmerId) {
        const since = new Date(Date.now() - SESSION_MS).toISOString();
        const { data } = await supabase
            .from('interaction_logs')
            .select('id')
            .eq('farmer_id', farmerId)
            .eq('channel', 'whatsapp')
            .eq('direction', 'inbound')
            .gte('created_at', since)
            .limit(1);
        return Boolean(data?.length);
    },
    async countInboundMessages(farmerId) {
        const { count } = await supabase
            .from('interaction_logs')
            .select('id', { count: 'exact', head: true })
            .eq('farmer_id', farmerId)
            .eq('channel', 'whatsapp')
            .eq('direction', 'inbound');
        return count ?? 0;
    },
    async markWelcomeTemplateSent(farmerId) {
        const { data } = await supabase.from('farmers').select('metadata').eq('id', farmerId).single();
        const meta = (data?.metadata ?? {});
        await supabase
            .from('farmers')
            .update({
            metadata: { ...meta, welcome_template_sent: true, welcome_template_at: new Date().toISOString() },
            updated_at: new Date().toISOString(),
        })
            .eq('id', farmerId);
    },
    async shouldSendWelcomeTemplate(farmerId) {
        if (!env.WHATSAPP_WELCOME_TEMPLATE?.trim())
            return false;
        const { data } = await supabase.from('farmers').select('metadata').eq('id', farmerId).single();
        const meta = (data?.metadata ?? {});
        if (meta.welcome_template_sent)
            return false;
        const inboundCount = await this.countInboundMessages(farmerId);
        return inboundCount <= 1;
    },
};
//# sourceMappingURL=whatsapp-session.service.js.map