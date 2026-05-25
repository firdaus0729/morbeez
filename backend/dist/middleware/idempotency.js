import { supabase } from '../lib/supabase.js';
import { logger } from '../lib/logger.js';
/**
 * Returns true if webhook was already processed (duplicate).
 * Uses webhook_logs.idempotency_key unique constraint.
 */
export async function isWebhookDuplicate(provider, idempotencyKey) {
    const { data } = await supabase
        .from('webhook_logs')
        .select('id')
        .eq('provider', provider)
        .eq('idempotency_key', idempotencyKey)
        .maybeSingle();
    return !!data;
}
export async function logWebhook(provider, topic, idempotencyKey, payload, status, errorMessage) {
    const { error } = await supabase.from('webhook_logs').insert({
        provider,
        topic,
        idempotency_key: idempotencyKey,
        payload,
        status,
        error_message: errorMessage ?? null,
    });
    if (error?.code === '23505') {
        logger.info({ provider, idempotencyKey }, 'Duplicate webhook ignored');
        return;
    }
    if (error) {
        logger.error({ error, provider }, 'Failed to log webhook');
    }
}
//# sourceMappingURL=idempotency.js.map