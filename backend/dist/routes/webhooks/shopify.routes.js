import { verifyShopifyWebhook } from '../../middleware/webhookVerify.js';
import { isWebhookDuplicate, logWebhook } from '../../middleware/idempotency.js';
import { shopifyWebhookService } from '../../services/shopify/shopify.webhook.service.js';
export async function shopifyWebhookRoutes(app) {
    app.addContentTypeParser('application/json', { parseAs: 'buffer' }, (_req, body, done) => {
        done(null, body);
    });
    app.post('/webhooks/shopify', async (request, reply) => {
        const raw = request.body;
        const topic = request.headers['x-shopify-topic'];
        const webhookId = request.headers['x-shopify-webhook-id'];
        verifyShopifyWebhook(raw, request.headers['x-shopify-hmac-sha256']);
        if (await isWebhookDuplicate('shopify', webhookId)) {
            await logWebhook('shopify', topic, webhookId, {}, 'duplicate');
            return reply.code(200).send({ ok: true, duplicate: true });
        }
        const payload = JSON.parse(raw.toString());
        try {
            if (topic === 'orders/create') {
                await shopifyWebhookService.handleOrderCreate(payload);
            }
            else if (topic === 'orders/paid') {
                await shopifyWebhookService.handleOrderPaid(payload);
            }
            else if (topic === 'orders/updated') {
                const order = payload;
                if (order.financial_status === 'paid') {
                    await shopifyWebhookService.handleOrderPaid(order);
                }
                await shopifyWebhookService.syncOrder(order);
            }
            else if (topic === 'fulfillments/create' ||
                topic === 'fulfillments/update' ||
                topic === 'orders/fulfilled') {
                const fulfillment = (payload.fulfillment ?? payload);
                await shopifyWebhookService.handleFulfillment(fulfillment);
            }
            await logWebhook('shopify', topic, webhookId, payload, 'processed');
            return reply.code(200).send({ ok: true });
        }
        catch (err) {
            await logWebhook('shopify', topic, webhookId, payload, 'failed', String(err));
            throw err;
        }
    });
}
//# sourceMappingURL=shopify.routes.js.map