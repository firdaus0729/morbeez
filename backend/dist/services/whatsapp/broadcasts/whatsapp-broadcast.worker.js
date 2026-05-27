import { env } from '../../../config/env.js';
import { logger } from '../../../lib/logger.js';
import { broadcastEngineService } from './broadcast-engine.service.js';
/** Poll every 15 min; send only during morning window (IST 7:00–9:59). */
const POLL_MS = 15 * 60_000;
function isBroadcastWindow() {
    const hour = Number(new Intl.DateTimeFormat('en-IN', {
        timeZone: 'Asia/Kolkata',
        hour: 'numeric',
        hour12: false,
    }).format(new Date()));
    return hour >= 7 && hour < 10;
}
let lastRunDateKey = null;
async function tick() {
    if (!isBroadcastWindow())
        return;
    const dateKey = new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Kolkata' }).format(new Date());
    if (lastRunDateKey === dateKey)
        return;
    lastRunDateKey = dateKey;
    await broadcastEngineService.runDailyBroadcasts();
}
let interval = null;
export function startWhatsAppBroadcastWorker() {
    if (env.NODE_ENV === 'test' || !env.ENABLE_WHATSAPP_BROADCASTS)
        return;
    if (interval)
        return;
    interval = setInterval(() => {
        tick().catch((err) => logger.error({ err }, 'WhatsApp broadcast worker error'));
    }, POLL_MS);
    tick().catch((err) => logger.error({ err }, 'WhatsApp broadcast initial tick error'));
    logger.info('WhatsApp broadcast worker started (IST 07:00–09:59 window)');
}
/** For admin manual trigger — bypasses daily window guard. */
export async function runBroadcastsNow(options) {
    return broadcastEngineService.runDailyBroadcasts(options);
}
//# sourceMappingURL=whatsapp-broadcast.worker.js.map