/**
 * Stable idempotency keys for Meta WhatsApp Cloud webhooks.
 * Do NOT use JSON.stringify(entry).slice(0, 128) — metadata prefix is identical
 * for messages vs statuses, so real farmer messages were dropped as duplicates.
 */
export function metaWhatsAppIdempotencyKey(payload: Record<string, unknown>): string {
  const entry = (payload.entry as Array<Record<string, unknown>>)?.[0];
  const changes = (entry?.changes as Array<Record<string, unknown>>)?.[0];
  const value = changes?.value as Record<string, unknown> | undefined;
  const field = String(changes?.field ?? 'unknown');

  const messages = value?.messages as Array<Record<string, unknown>> | undefined;
  if (messages?.length) {
    return messages.map((m) => `msg:${String(m.id ?? '')}`).filter(Boolean).join('|');
  }

  const statuses = value?.statuses as Array<Record<string, unknown>> | undefined;
  if (statuses?.length) {
    return statuses
      .map((s) => `status:${String(s.id ?? '')}:${String(s.status ?? '')}`)
      .filter(Boolean)
      .join('|');
  }

  const entryId = String(entry?.id ?? 'entry');
  return `meta:${entryId}:${field}:${Date.now()}`;
}

export function summarizeMetaWhatsAppValue(value: Record<string, unknown> | undefined): {
  messageCount: number;
  statusCount: number;
  messageIds: string[];
} {
  const messages = value?.messages as Array<Record<string, unknown>> | undefined;
  const statuses = value?.statuses as Array<Record<string, unknown>> | undefined;
  return {
    messageCount: messages?.length ?? 0,
    statusCount: statuses?.length ?? 0,
    messageIds: (messages ?? []).map((m) => String(m.id ?? '')).filter(Boolean),
  };
}
