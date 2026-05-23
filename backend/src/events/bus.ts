import { randomUUID } from 'crypto';
import { logger } from '../lib/logger.js';
import { supabase } from '../lib/supabase.js';
import type { EventHandler, MorbeezEvent, MorbeezEventType } from './types.js';

/**
 * In-process event bus with outbox persistence.
 * M3: swap publish() backend to BullMQ without changing handlers.
 */
class EventBus {
  private handlers = new Map<MorbeezEventType, EventHandler[]>();

  on(type: MorbeezEventType, handler: EventHandler): void {
    const list = this.handlers.get(type) ?? [];
    list.push(handler);
    this.handlers.set(type, list);
  }

  async publish<T extends Record<string, unknown>>(
    type: MorbeezEventType,
    payload: T,
    source: string,
    idempotencyKey?: string
  ): Promise<MorbeezEvent<T>> {
    const event: MorbeezEvent<T> = {
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
  async replay(event: MorbeezEvent): Promise<boolean> {
    return this.dispatch(event);
  }

  private async dispatch(event: MorbeezEvent): Promise<boolean> {
    const handlers = this.handlers.get(event.type) ?? [];
    if (handlers.length === 0) {
      logger.warn({ eventType: event.type }, 'No handlers for event');
      return true;
    }

    let success = true;
    for (const handler of handlers) {
      try {
        await handler(event);
      } catch (err) {
        success = false;
        logger.error({ err, eventType: event.type, eventId: event.id }, 'Event handler failed');
      }
    }
    return success;
  }

  private async persistOutbox(event: MorbeezEvent, status: string): Promise<void> {
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

  private async updateOutboxStatus(id: string, status: 'processed' | 'failed'): Promise<void> {
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

  async incrementRetry(id: string, retryCount: number): Promise<void> {
    await supabase
      .from('event_outbox')
      .update({ retry_count: retryCount, status: 'pending' })
      .eq('id', id);
  }

  async markFailedPermanent(id: string): Promise<void> {
    await supabase.from('event_outbox').update({ status: 'failed' }).eq('id', id);
  }
}

export const eventBus = new EventBus();
