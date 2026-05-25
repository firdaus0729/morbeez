/**
 * Returns true if webhook was already processed (duplicate).
 * Uses webhook_logs.idempotency_key unique constraint.
 */
export declare function isWebhookDuplicate(provider: string, idempotencyKey: string): Promise<boolean>;
export declare function logWebhook(provider: string, topic: string, idempotencyKey: string, payload: unknown, status: 'processed' | 'failed' | 'duplicate', errorMessage?: string): Promise<void>;
//# sourceMappingURL=idempotency.d.ts.map