import { env } from '../../config/env.js';
import { verifyWhatsAppWebhook } from '../../middleware/webhookVerify.js';
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
//# sourceMappingURL=whatsapp.routes.js.map