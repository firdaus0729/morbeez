import { env } from '../../config/env.js';
import { logWebhook } from '../../middleware/idempotency.js';
import { shiprocketService } from '../../services/shiprocket/shiprocket.service.js';
import { UnauthorizedError } from '../../lib/errors.js';
/** Shiprocket forbids "shiprocket", "sr", "kr" in webhook URLs — use /webhooks/tracking in their dashboard */
function verifyShiprocketWebhookToken(request) {
    if (!env.SHIPROCKET_WEBHOOK_TOKEN)
        return;
    const expected = env.SHIPROCKET_WEBHOOK_TOKEN;
    const candidates = [
        request.headers['x-api-key'],
        request.headers['x-shiprocket-token'],
        request.headers.authorization,
    ];
    for (const raw of candidates) {
        if (!raw)
            continue;
        const value = String(raw).replace(/^Bearer\s+/i, '').trim();
        if (value === expected)
            return;
    }
    throw new UnauthorizedError('Invalid Shiprocket webhook token');
}
async function handleTrackingWebhook(request, reply) {
    verifyShiprocketWebhookToken(request);
    const body = request.body;
    const idempotencyKey = String(body.awb ?? body.shipment_id ?? Date.now());
    try {
        await shiprocketService.handleTrackingWebhook(body);
        await logWebhook('shiprocket', 'tracking', idempotencyKey, body, 'processed');
        return reply.code(200).send({ ok: true });
    }
    catch (err) {
        await logWebhook('shiprocket', 'tracking', idempotencyKey, body, 'failed', String(err));
        throw err;
    }
}
export async function shiprocketWebhookRoutes(app) {
    /** Use this URL in Shiprocket dashboard (no forbidden keywords) */
    app.post('/webhooks/tracking', handleTrackingWebhook);
    /** Legacy alias — do NOT register this URL in Shiprocket (blocked) */
    app.post('/webhooks/shiprocket', handleTrackingWebhook);
}
//# sourceMappingURL=shiprocket.routes.js.map