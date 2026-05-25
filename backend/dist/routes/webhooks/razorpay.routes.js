import { verifyRazorpayWebhook } from '../../middleware/webhookVerify.js';
import { isWebhookDuplicate, logWebhook } from '../../middleware/idempotency.js';
import { razorpayService } from '../../services/razorpay/razorpay.service.js';
export async function razorpayWebhookRoutes(app) {
    app.addContentTypeParser('application/json', { parseAs: 'buffer' }, (_req, body, done) => {
        done(null, body);
    });
    app.post('/webhooks/razorpay', async (request, reply) => {
        const raw = request.body;
        const signature = request.headers['x-razorpay-signature'];
        verifyRazorpayWebhook(raw, signature);
        const payload = JSON.parse(raw.toString());
        const idempotencyKey = `${payload.event}-${payload.payload?.payment?.entity?.id ?? raw.length}`;
        if (await isWebhookDuplicate('razorpay', idempotencyKey)) {
            return reply.code(200).send({ ok: true, duplicate: true });
        }
        try {
            await razorpayService.handleWebhook(payload.event, payload);
            await logWebhook('razorpay', payload.event, idempotencyKey, payload, 'processed');
            return reply.code(200).send({ ok: true });
        }
        catch (err) {
            await logWebhook('razorpay', payload.event, idempotencyKey, payload, 'failed', String(err));
            throw err;
        }
    });
}
//# sourceMappingURL=razorpay.routes.js.map