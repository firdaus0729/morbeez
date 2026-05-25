import type { EventHandler, MorbeezEvent, MorbeezEventType } from './types.js';
/**
 * In-process event bus with outbox persistence.
 * M3: swap publish() backend to BullMQ without changing handlers.
 */
declare class EventBus {
    private handlers;
    on(type: MorbeezEventType, handler: EventHandler): void;
    publish<T extends Record<string, unknown>>(type: MorbeezEventType, payload: T, source: string, idempotencyKey?: string): Promise<MorbeezEvent<T>>;
    /** Replay event from outbox (worker) */
    replay(event: MorbeezEvent): Promise<boolean>;
    private dispatch;
    private persistOutbox;
    private updateOutboxStatus;
    incrementRetry(id: string, retryCount: number): Promise<void>;
    markFailedPermanent(id: string): Promise<void>;
}
export declare const eventBus: EventBus;
export {};
//# sourceMappingURL=bus.d.ts.map