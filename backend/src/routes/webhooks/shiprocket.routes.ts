import type { FastifyInstance } from 'fastify';
import { env } from '../../config/env.js';
import { logWebhook } from '../../middleware/idempotency.js';
import { shiprocketService } from '../../services/shiprocket/shiprocket.service.js';
import { UnauthorizedError } from '../../lib/errors.js';

export async function shiprocketWebhookRoutes(app: FastifyInstance): Promise<void> {
  app.post('/webhooks/shiprocket', async (request, reply) => {
    if (env.SHIPROCKET_WEBHOOK_TOKEN) {
      const token = request.headers['x-shiprocket-token'] ?? request.headers['authorization'];
      if (token !== env.SHIPROCKET_WEBHOOK_TOKEN) {
        throw new UnauthorizedError('Invalid Shiprocket webhook token');
      }
    }

    const body = request.body as Record<string, unknown>;
    const idempotencyKey = String(body.awb ?? body.shipment_id ?? Date.now());

    try {
      await shiprocketService.handleTrackingWebhook(body);
      await logWebhook('shiprocket', 'tracking', idempotencyKey, body, 'processed');
      return reply.code(200).send({ ok: true });
    } catch (err) {
      await logWebhook('shiprocket', 'tracking', idempotencyKey, body, 'failed', String(err));
      throw err;
    }
  });
}
