import { env } from '../../config/env.js';
import { logger } from '../../lib/logger.js';
import { supabase } from '../../lib/supabase.js';

const POLL_MS = 6 * 60_000; // every 6 minutes
const RETENTION_DAYS = 3;

async function redactWebhookPayloads(): Promise<number> {
  const cutoff = new Date(Date.now() - RETENTION_DAYS * 24 * 60 * 60 * 1000).toISOString();
  const { data, error } = await supabase
    .from('webhook_logs')
    .select('id')
    .eq('payload_redacted', false)
    .lte('created_at', cutoff)
    .limit(200);
  if (error) throw error;
  if (!data?.length) return 0;

  const ids = data.map((r) => r.id);
  const { error: updErr } = await supabase
    .from('webhook_logs')
    .update({ payload: {}, payload_redacted: true })
    .in('id', ids);
  if (updErr) throw updErr;
  return ids.length;
}

async function redactInteractionPayloads(): Promise<number> {
  const cutoff = new Date(Date.now() - RETENTION_DAYS * 24 * 60 * 60 * 1000).toISOString();
  const { data, error } = await supabase
    .from('interaction_logs')
    .select('id')
    .eq('payload_redacted', false)
    .lte('created_at', cutoff)
    .limit(200);
  if (error) throw error;
  if (!data?.length) return 0;

  const ids = data.map((r) => r.id);
  const { error: updErr } = await supabase
    .from('interaction_logs')
    .update({ raw_payload: {}, payload_redacted: true })
    .in('id', ids);
  if (updErr) throw updErr;
  return ids.length;
}

async function cleanupMediaTables(): Promise<Record<string, number>> {
  const cutoff = new Date(Date.now() - RETENTION_DAYS * 24 * 60 * 60 * 1000).toISOString();
  const out: Record<string, number> = {};

  // Image hashes beyond retention can be purged (dedup window = retention window).
  for (const table of ['farmer_image_hashes'] as const) {
    const { data, error } = await supabase.from(table).select('id').lte('created_at', cutoff).limit(500);
    if (error) throw error;
    const ids = (data ?? []).map((r) => r.id);
    if (!ids.length) {
      out[table] = 0;
      continue;
    }
    const { error: delErr } = await supabase.from(table).delete().in('id', ids);
    if (delErr) throw delErr;
    out[table] = ids.length;
  }

  return out;
}

async function tick(): Promise<void> {
  try {
    const webhooks = await redactWebhookPayloads();
    const interactions = await redactInteractionPayloads();
    const media = await cleanupMediaTables();
    if (webhooks || interactions || Object.values(media).some((n) => n > 0)) {
      logger.info({ webhooks, interactions, media }, 'Retention cleanup ran');
    }
  } catch (err) {
    logger.error({ err }, 'Retention cleanup failed');
  }
}

let interval: ReturnType<typeof setInterval> | null = null;

export function startRetentionCleanupWorker(): void {
  if (env.NODE_ENV === 'test') return;
  if (!env.ENABLE_RETENTION_CLEANUP) return;
  if (interval) return;
  interval = setInterval(() => void tick(), POLL_MS);
  void tick();
  logger.info({ pollMs: POLL_MS, retentionDays: RETENTION_DAYS }, 'Retention cleanup worker started');
}

