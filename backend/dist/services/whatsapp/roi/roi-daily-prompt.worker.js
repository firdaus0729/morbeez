import { env } from '../../../config/env.js';
import { logger } from '../../../lib/logger.js';
import { roiFlowService } from './roi-flow.service.js';
/** Poll every 10 minutes; send during evening window (IST 18:00–20:59). */
const POLL_MS = 10 * 60_000;
function istHour() {
    return Number(new Intl.DateTimeFormat('en-IN', {
        timeZone: 'Asia/Kolkata',
        hour: 'numeric',
        hour12: false,
    }).format(new Date()));
}
function isEveningPromptWindow() {
    const hour = istHour();
    return hour >= 18 && hour < 21;
}
let lastBatchDateKey = null;
let interval = null;
async function tick() {
    if (!isEveningPromptWindow())
        return;
    const dateKey = new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Kolkata' }).format(new Date());
    if (lastBatchDateKey === dateKey)
        return;
    lastBatchDateKey = dateKey;
    const result = await roiFlowService.runDailyPromptsBatch();
    logger.info(result, 'ROI daily prompt batch completed');
}
export function startRoiDailyPromptWorker() {
    if (env.NODE_ENV === 'test' || !env.ENABLE_WHATSAPP_ROI || env.ENABLE_ROI_DAILY_PROMPT === false) {
        return;
    }
    if (interval)
        return;
    interval = setInterval(() => {
        tick().catch((err) => logger.error({ err }, 'ROI daily prompt worker error'));
    }, POLL_MS);
    tick().catch((err) => logger.error({ err }, 'ROI daily prompt worker initial tick error'));
    logger.info('ROI daily prompt worker started (IST 18:00–20:59 window)');
}
/** Manual / admin trigger — bypasses once-per-day worker guard. */
export async function runRoiDailyPromptsNow(options) {
    lastBatchDateKey = null;
    return roiFlowService.runDailyPromptsBatch(options);
}
//# sourceMappingURL=roi-daily-prompt.worker.js.map