/**
 * Stable idempotency keys for Meta WhatsApp Cloud webhooks.
 * Do NOT use JSON.stringify(entry).slice(0, 128) — metadata prefix is identical
 * for messages vs statuses, so real farmer messages were dropped as duplicates.
 */
export declare function metaWhatsAppIdempotencyKey(payload: Record<string, unknown>): string;
export declare function summarizeMetaWhatsAppValue(value: Record<string, unknown> | undefined): {
    messageCount: number;
    statusCount: number;
    messageIds: string[];
};
//# sourceMappingURL=meta-whatsapp-webhook.d.ts.map