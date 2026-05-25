import { env } from '../../config/env.js';
import { eventBus } from '../../events/bus.js';
import { supabase } from '../../lib/supabase.js';
import { logger } from '../../lib/logger.js';
const MAX_RETRIES = 5;
const POLL_INTERVAL_MS = 30_000;
const BATCH_SIZE = 20;
export class OutboxWorker {
    timer = null;
    start() {
        if (this.timer)
            return;
        logger.info({ intervalMs: POLL_INTERVAL_MS }, 'Outbox worker started');
        this.timer = setInterval(() => {
            void this.processBatch();
        }, POLL_INTERVAL_MS);
        void this.processBatch();
    }
    stop() {
        if (this.timer) {
            clearInterval(this.timer);
            this.timer = null;
        }
    }
    async processBatch() {
        const { data: rows, error } = await supabase
            .from('event_outbox')
            .select('*')
            .in('status', ['pending', 'failed'])
            .lt('retry_count', MAX_RETRIES)
            .order('created_at', { ascending: true })
            .limit(BATCH_SIZE);
        if (error) {
            logger.error({ error }, 'Outbox poll failed');
            return 0;
        }
        if (!rows?.length)
            return 0;
        let processed = 0;
        for (const row of rows) {
            const event = {
                id: row.id,
                type: row.event_type,
                occurredAt: row.created_at,
                source: row.source,
                payload: row.payload,
                idempotencyKey: row.idempotency_key ?? undefined,
            };
            const ok = await eventBus.replay(event);
            if (ok) {
                await supabase
                    .from('event_outbox')
                    .update({ status: 'processed', processed_at: new Date().toISOString() })
                    .eq('id', row.id);
                processed++;
            }
            else {
                const nextRetry = (row.retry_count ?? 0) + 1;
                if (nextRetry >= MAX_RETRIES) {
                    await eventBus.markFailedPermanent(row.id);
                    logger.error({ eventId: row.id, type: row.event_type }, 'Outbox event permanently failed');
                }
                else {
                    await eventBus.incrementRetry(row.id, nextRetry);
                }
            }
        }
        if (processed > 0) {
            logger.info({ processed, batch: rows.length }, 'Outbox batch processed');
        }
        return processed;
    }
}
export const outboxWorker = new OutboxWorker();
/** Skip worker in test */
export function startOutboxWorkerIfEnabled() {
    if (env.NODE_ENV === 'test' || !env.ENABLE_OUTBOX_WORKER)
        return;
    outboxWorker.start();
}
//# sourceMappingURL=outbox.worker.js.map