import type { FastifyInstance } from 'fastify';
import { verifyShopifyWebhook } from '../../middleware/webhookVerify.js';
import { isWebhookDuplicate, logWebhook } from '../../middleware/idempotency.js';
import { shopifyWebhookService } from '../../services/shopify/shopify.webhook.service.js';
import type { ShopifyOrder } from '../../services/shopify/shopify.client.js';
import type { ShopifyFulfillment } from '../../services/shopify/shopify.webhook.service.js';

export async function shopifyWebhookRoutes(app: FastifyInstance): Promise<void> {
  app.addContentTypeParser('application/json', { parseAs: 'buffer' }, (_req, body, done) => {
    done(null, body);
  });

  app.post('/webhooks/shopify', async (request, reply) => {
    const raw = request.body as Buffer;
    const topic = request.headers['x-shopify-topic'] as string;
    const webhookId = request.headers['x-shopify-webhook-id'] as string;

    verifyShopifyWebhook(raw, request.headers['x-shopify-hmac-sha256'] as string);

    if (await isWebhookDuplicate('shopify', webhookId)) {
      await logWebhook('shopify', topic, webhookId, {}, 'duplicate');
      return reply.code(200).send({ ok: true, duplicate: true });
    }

    const payload = JSON.parse(raw.toString()) as Record<string, unknown>;

    try {
      if (topic === 'orders/create') {
        await shopifyWebhookService.handleOrderCreate(payload as unknown as ShopifyOrder);
      } else if (topic === 'orders/paid') {
        await shopifyWebhookService.handleOrderPaid(payload as unknown as ShopifyOrder);
      } else if (topic === 'orders/updated') {
        const order = payload as unknown as ShopifyOrder;
        if (order.financial_status === 'paid') {
          await shopifyWebhookService.handleOrderPaid(order);
        }
        await shopifyWebhookService.syncOrder(order);
      } else if (
        topic === 'fulfillments/create' ||
        topic === 'fulfillments/update' ||
        topic === 'orders/fulfilled'
      ) {
        const fulfillment = (payload.fulfillment ?? payload) as ShopifyFulfillment;
        await shopifyWebhookService.handleFulfillment(fulfillment);
      }

      await logWebhook('shopify', topic, webhookId, payload, 'processed');
      return reply.code(200).send({ ok: true });
    } catch (err) {
      await logWebhook('shopify', topic, webhookId, payload, 'failed', String(err));
      throw err;
    }
  });
}
