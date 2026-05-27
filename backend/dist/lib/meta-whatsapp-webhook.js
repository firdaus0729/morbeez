/**
 * Stable idempotency keys for Meta WhatsApp Cloud webhooks.
 * Do NOT use JSON.stringify(entry).slice(0, 128) — metadata prefix is identical
 * for messages vs statuses, so real farmer messages were dropped as duplicates.
 */
export function metaWhatsAppIdempotencyKey(payload) {
    const entry = payload.entry?.[0];
    const changes = entry?.changes?.[0];
    const value = changes?.value;
    const field = String(changes?.field ?? 'unknown');
    const messages = value?.messages;
    if (messages?.length) {
        return messages.map((m) => `msg:${String(m.id ?? '')}`).filter(Boolean).join('|');
    }
    const statuses = value?.statuses;
    if (statuses?.length) {
        return statuses
            .map((s) => `status:${String(s.id ?? '')}:${String(s.status ?? '')}`)
            .filter(Boolean)
            .join('|');
    }
    const entryId = String(entry?.id ?? 'entry');
    return `meta:${entryId}:${field}:${Date.now()}`;
}
export function summarizeMetaWhatsAppValue(value) {
    const messages = value?.messages;
    const statuses = value?.statuses;
    return {
        messageCount: messages?.length ?? 0,
        statusCount: statuses?.length ?? 0,
        messageIds: (messages ?? []).map((m) => String(m.id ?? '')).filter(Boolean),
    };
}
//# sourceMappingURL=meta-whatsapp-webhook.js.map