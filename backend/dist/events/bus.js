import { randomUUID } from 'crypto';
import { logger } from '../lib/logger.js';
import { supabase } from '../lib/supabase.js';
/**
 * In-process event bus with outbox persistence.
 * M3: swap publish() backend to BullMQ without changing handlers.
 */
class EventBus {
    handlers = new Map();
    on(type, handler) {
        const list = this.handlers.get(type) ?? [];
        list.push(handler);
        this.handlers.set(type, list);
    }
    async publish(type, payload, source, idempotencyKey) {
        const event = {
            id: randomUUID(),
            type,
            occurredAt: new Date().toISOString(),
            source,
            payload,
            idempotencyKey,
        };
        await this.persistOutbox(event, 'pending');
        const ok = await this.dispatch(event);
        await this.updateOutboxStatus(event.id, ok ? 'processed' : 'failed');
        return event;
    }
    /** Replay event from outbox (worker) */
    async replay(event) {
        return this.dispatch(event);
    }
    async dispatch(event) {
        const handlers = this.handlers.get(event.type) ?? [];
        if (handlers.length === 0) {
            logger.warn({ eventType: event.type }, 'No handlers for event');
            return true;
        }
        let success = true;
        for (const handler of handlers) {
            try {
                await handler(event);
            }
            catch (err) {
                success = false;
                logger.error({ err, eventType: event.type, eventId: event.id }, 'Event handler failed');
            }
        }
        return success;
    }
    async persistOutbox(event, status) {
        const { error } = await supabase.from('event_outbox').insert({
            id: event.id,
            event_type: event.type,
            source: event.source,
            payload: event.payload,
            idempotency_key: event.idempotencyKey ?? null,
            status,
        });
        if (error) {
            logger.warn({ error, eventId: event.id }, 'Outbox insert failed');
        }
    }
    async updateOutboxStatus(id, status) {
        const { error } = await supabase
            .from('event_outbox')
            .update({
            status,
            processed_at: status === 'processed' ? new Date().toISOString() : null,
        })
            .eq('id', id);
        if (error) {
            logger.warn({ error, eventId: id }, 'Outbox status update failed');
        }
    }
    async incrementRetry(id, retryCount) {
        await supabase
            .from('event_outbox')
            .update({ retry_count: retryCount, status: 'pending' })
            .eq('id', id);
    }
    async markFailedPermanent(id) {
        await supabase.from('event_outbox').update({ status: 'failed' }).eq('id', id);
    }
}
export const eventBus = new EventBus();
//# sourceMappingURL=bus.js.map