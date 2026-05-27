import { env } from '../../../config/env.js';
import { logger } from '../../../lib/logger.js';
import { broadcastEngineService } from './broadcast-engine.service.js';

/** Poll every 15 min; send only during morning window (IST 7:00–9:59). */
const POLL_MS = 15 * 60_000;

function isBroadcastWindow(): boolean {
  const hour = Number(
    new Intl.DateTimeFormat('en-IN', {
      timeZone: 'Asia/Kolkata',
      hour: 'numeric',
      hour12: false,
    }).format(new Date())
  );
  return hour >= 7 && hour < 10;
}

let lastRunDateKey: string | null = null;

async function tick(): Promise<void> {
  if (!isBroadcastWindow()) return;

  const dateKey = new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Kolkata' }).format(new Date());
  if (lastRunDateKey === dateKey) return;

  lastRunDateKey = dateKey;
  await broadcastEngineService.runDailyBroadcasts();
}

let interval: ReturnType<typeof setInterval> | null = null;

export function startWhatsAppBroadcastWorker(): void {
  if (env.NODE_ENV === 'test' || !env.ENABLE_WHATSAPP_BROADCASTS) return;
  if (interval) return;

  interval = setInterval(() => {
    tick().catch((err) => logger.error({ err }, 'WhatsApp broadcast worker error'));
  }, POLL_MS);

  tick().catch((err) => logger.error({ err }, 'WhatsApp broadcast initial tick error'));
  logger.info('WhatsApp broadcast worker started (IST 07:00–09:59 window)');
}

/** For admin manual trigger — bypasses daily window guard. */
export async function runBroadcastsNow(options?: Parameters<typeof broadcastEngineService.runDailyBroadcasts>[0]) {
  return broadcastEngineService.runDailyBroadcasts(options);
}
