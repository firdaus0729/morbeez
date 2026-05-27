import { supabase } from '../../lib/supabase.js';
import { logger } from '../../lib/logger.js';
export const conversationSessionService = {
    async ensureWhatsAppSession(farmerId) {
        const now = new Date().toISOString();
        const { data, error } = await supabase
            .from('conversation_sessions')
            .upsert({
            farmer_id: farmerId,
            channel: 'whatsapp',
            state: 'language_select',
            updated_at: now,
        }, { onConflict: 'farmer_id,channel' })
            .select('id, farmer_id, channel, state, preferred_language, conversation_owner, ai_paused, last_menu_at, last_ai_at, active_plot_id, active_block_id, context')
            .single();
        if (error)
            throw error;
        const row = data;
        row.context = (row.context ?? {});
        return row;
    },
    async getContext(farmerId) {
        const { data } = await supabase
            .from('conversation_sessions')
            .select('context')
            .eq('farmer_id', farmerId)
            .eq('channel', 'whatsapp')
            .maybeSingle();
        return (data?.context ?? {});
    },
    async patchContext(farmerId, patch) {
        const current = await this.getContext(farmerId);
        const next = { ...current, ...patch };
        const now = new Date().toISOString();
        await supabase
            .from('conversation_sessions')
            .update({ context: next, updated_at: now })
            .eq('farmer_id', farmerId)
            .eq('channel', 'whatsapp');
        return next;
    },
    async setLanguage(farmerId, language) {
        const now = new Date().toISOString();
        await supabase
            .from('conversation_sessions')
            .update({ preferred_language: language, state: 'main_menu', updated_at: now })
            .eq('farmer_id', farmerId)
            .eq('channel', 'whatsapp');
        // Also persist on farmer profile for global use.
        await supabase
            .from('farmers')
            .update({ preferred_language: language, updated_at: now })
            .eq('id', farmerId);
    },
    async setState(farmerId, state, patch) {
        const now = new Date().toISOString();
        const payload = { state, updated_at: now, ...(patch ?? {}) };
        const { error } = await supabase
            .from('conversation_sessions')
            .update(payload)
            .eq('farmer_id', farmerId)
            .eq('channel', 'whatsapp');
        if (error) {
            logger.error({ error, farmerId, state }, 'Failed to update conversation session');
        }
    },
    async clearActivePlot(farmerId) {
        const now = new Date().toISOString();
        await supabase
            .from('conversation_sessions')
            .update({ active_plot_id: null, active_block_id: null, updated_at: now })
            .eq('farmer_id', farmerId)
            .eq('channel', 'whatsapp');
        const ctx = await this.getContext(farmerId);
        const { activeCropType: _a, activePlotLabel: _b, ...rest } = ctx;
        await this.patchContext(farmerId, rest);
    },
    async shouldPauseAi(farmerId) {
        const { data } = await supabase
            .from('conversation_sessions')
            .select('ai_paused, conversation_owner')
            .eq('farmer_id', farmerId)
            .eq('channel', 'whatsapp')
            .maybeSingle();
        return Boolean(data?.ai_paused) || (data?.conversation_owner && data.conversation_owner !== 'ai');
    },
};
//# sourceMappingURL=conversation-session.service.js.map