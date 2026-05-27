import { env } from '../../../config/env.js';
import { supabase } from '../../../lib/supabase.js';
const DEFAULT_MAX_PER_DAY = 2;
const DEFAULT_KIND_COOLDOWN_HOURS = 72;
const HIGH_PRIORITY_THRESHOLD = 70;
export const broadcastThrottleService = {
    maxPerDay() {
        return env.WHATSAPP_BROADCAST_MAX_PER_DAY ?? DEFAULT_MAX_PER_DAY;
    },
    kindCooldownHours() {
        return env.WHATSAPP_BROADCAST_KIND_COOLDOWN_HOURS ?? DEFAULT_KIND_COOLDOWN_HOURS;
    },
    async shouldSend(params) {
        const { data: session } = await supabase
            .from('conversation_sessions')
            .select('ai_paused, conversation_owner, preferred_language')
            .eq('farmer_id', params.farmerId)
            .eq('channel', 'whatsapp')
            .maybeSingle();
        if (session?.ai_paused) {
            return { allowed: false, reason: 'ai_paused' };
        }
        if (session?.conversation_owner && session.conversation_owner !== 'ai') {
            return { allowed: false, reason: 'human_takeover' };
        }
        const sinceDay = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
        const { count: sentToday } = await supabase
            .from('whatsapp_broadcast_deliveries')
            .select('id', { count: 'exact', head: true })
            .eq('farmer_id', params.farmerId)
            .eq('status', 'sent')
            .gte('created_at', sinceDay);
        const maxDay = this.maxPerDay();
        const isHighPriority = params.priority >= HIGH_PRIORITY_THRESHOLD;
        if ((sentToday ?? 0) >= maxDay && !isHighPriority) {
            return { allowed: false, reason: 'daily_limit' };
        }
        if ((sentToday ?? 0) >= maxDay + 1) {
            return { allowed: false, reason: 'daily_limit_even_high_priority' };
        }
        const sinceKind = new Date(Date.now() - this.kindCooldownHours() * 60 * 60 * 1000).toISOString();
        const { data: sameKind } = await supabase
            .from('whatsapp_broadcast_deliveries')
            .select('id')
            .eq('farmer_id', params.farmerId)
            .eq('broadcast_kind', params.broadcastKind)
            .eq('status', 'sent')
            .gte('created_at', sinceKind)
            .limit(1);
        if (sameKind?.length) {
            return { allowed: false, reason: 'duplicate_kind' };
        }
        // Irrelevant crop: skip crop-specific broadcast if farmer has no matching crop
        if (params.cropType !== 'all') {
            const { count } = await supabase
                .from('farmer_crops')
                .select('id', { count: 'exact', head: true })
                .eq('farmer_id', params.farmerId)
                .eq('crop_type', params.cropType);
            if (!count) {
                return { allowed: false, reason: 'crop_not_relevant' };
            }
        }
        return { allowed: true };
    },
    async logSkipped(params) {
        await supabase.from('whatsapp_broadcast_deliveries').insert({
            farmer_id: params.farmerId,
            broadcast_kind: params.broadcastKind,
            crop_type: params.cropType,
            dap_at_send: params.dap ?? null,
            rule_id: params.ruleId ?? null,
            message_body: params.messageBody.slice(0, 2000),
            status: 'skipped',
            skip_reason: params.skipReason,
            priority: params.priority,
        });
    },
    async logSent(params) {
        await supabase.from('whatsapp_broadcast_deliveries').insert({
            farmer_id: params.farmerId,
            broadcast_kind: params.broadcastKind,
            crop_type: params.cropType,
            dap_at_send: params.dap ?? null,
            rule_id: params.ruleId ?? null,
            message_body: params.messageBody.slice(0, 2000),
            status: 'sent',
            priority: params.priority,
        });
    },
    async logFailed(params) {
        await supabase.from('whatsapp_broadcast_deliveries').insert({
            farmer_id: params.farmerId,
            broadcast_kind: params.broadcastKind,
            crop_type: params.cropType,
            message_body: params.messageBody.slice(0, 2000),
            status: 'failed',
            skip_reason: params.error.slice(0, 200),
            priority: params.priority,
        });
    },
};
//# sourceMappingURL=broadcast-throttle.service.js.map