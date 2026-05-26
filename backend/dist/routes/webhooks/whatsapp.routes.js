import { env } from '../../config/env.js';
import { createHmac, timingSafeEqual } from 'crypto';
import { verifyWhatsAppWebhook } from '../../middleware/webhookVerify.js';
import { WebhookVerificationError } from '../../lib/errors.js';
import { isWebhookDuplicate, logWebhook } from '../../middleware/idempotency.js';
import { whatsappService } from '../../services/whatsapp/whatsapp.service.js';
export async function whatsappWebhookRoutes(app) {
    app.addContentTypeParser('application/json', { parseAs: 'buffer' }, (_req, body, done) => {
        done(null, body);
    });
    /** Meta verification challenge */
    app.get('/webhooks/whatsapp', async (request, reply) => {
        const query = request.query;
        const mode = query['hub.mode'];
        const token = query['hub.verify_token'];
        const challenge = query['hub.challenge'];
        if (mode === 'subscribe' && token === env.WHATSAPP_VERIFY_TOKEN) {
            return reply.code(200).send(challenge);
        }
        return reply.code(403).send('Forbidden');
    });
    /** Ads Gyani — configure webhook URL in dashboard: https://<api>/webhooks/whatsapp/adsgyani */
    app.get('/webhooks/whatsapp/adsgyani', async (request, reply) => {
        const query = request.query;
        const mode = query['hub.mode'] ?? query.mode;
        const token = query['hub.verify_token'] ?? query.verify_token;
        const challenge = query['hub.challenge'] ?? query.challenge;
        const verifyToken = env.ADS_GYANI_WEBHOOK_VERIFY_TOKEN ?? env.WHATSAPP_VERIFY_TOKEN;
        if (mode === 'subscribe' && token === verifyToken) {
            return reply.code(200).send(challenge ?? 'ok');
        }
        return reply.code(403).send('Forbidden');
    });
    app.post('/webhooks/whatsapp/adsgyani', async (request, reply) => {
        const raw = request.body;
        verifyAdsGyaniWebhook(raw, request.headers);
        const payload = JSON.parse(raw.toString());
        const idempotencyKey = (payload.id != null && String(payload.id)) ||
            (payload.message_id != null && String(payload.message_id)) ||
            JSON.stringify(payload).slice(0, 128);
        if (await isWebhookDuplicate('whatsapp_adsgyani', idempotencyKey)) {
            return reply.code(200).send({ ok: true, duplicate: true });
        }
        try {
            await whatsappService.handleAdsGyaniInbound(payload);
            await logWebhook('whatsapp_adsgyani', 'messages', idempotencyKey, payload, 'processed');
            return reply.code(200).send({ ok: true });
        }
        catch (err) {
            await logWebhook('whatsapp_adsgyani', 'messages', idempotencyKey, payload, 'failed', String(err));
            throw err;
        }
    });
    app.post('/webhooks/whatsapp', async (request, reply) => {
        const raw = request.body;
        verifyWhatsAppWebhook(raw, request.headers['x-hub-signature-256']);
        const payload = JSON.parse(raw.toString());
        const idempotencyKey = JSON.stringify(payload.entry?.[0] ?? payload).slice(0, 128);
        if (await isWebhookDuplicate('whatsapp', idempotencyKey)) {
            return reply.code(200).send({ ok: true, duplicate: true });
        }
        try {
            await whatsappService.handleCloudInbound(payload);
            await logWebhook('whatsapp', 'messages', idempotencyKey, payload, 'processed');
            return reply.code(200).send({ ok: true });
        }
        catch (err) {
            await logWebhook('whatsapp', 'messages', idempotencyKey, payload, 'failed', String(err));
            throw err;
        }
    });
}
function verifyAdsGyaniWebhook(raw, headers) {
    const secret = env.ADS_GYANI_WEBHOOK_SECRET;
    if (!secret)
        return;
    const signature = headers['x-adsgyani-signature'] ?? headers['x-webhook-signature'];
    const auth = headers.authorization;
    if (typeof auth === 'string' && auth === `Bearer ${secret}`)
        return;
    if (typeof signature === 'string') {
        const expected = createHmac('sha256', secret).update(raw).digest('hex');
        const provided = signature.replace(/^sha256=/, '');
        const a = Buffer.from(expected);
        const b = Buffer.from(provided);
        if (a.length === b.length && timingSafeEqual(a, b))
            return;
    }
    throw new WebhookVerificationError('Ads Gyani');
}
//# sourceMappingURL=whatsapp.routes.js.map