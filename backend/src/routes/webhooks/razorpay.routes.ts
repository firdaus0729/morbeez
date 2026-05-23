import type { FastifyInstance } from 'fastify';
import { verifyRazorpayWebhook } from '../../middleware/webhookVerify.js';
import { isWebhookDuplicate, logWebhook } from '../../middleware/idempotency.js';
import { razorpayService } from '../../services/razorpay/razorpay.service.js';

export async function razorpayWebhookRoutes(app: FastifyInstance): Promise<void> {
  app.addContentTypeParser('application/json', { parseAs: 'buffer' }, (_req, body, done) => {
    done(null, body);
  });

  app.post('/webhooks/razorpay', async (request, reply) => {
    const raw = request.body as Buffer;
    const signature = request.headers['x-razorpay-signature'] as string;

    verifyRazorpayWebhook(raw, signature);

    const payload = JSON.parse(raw.toString()) as { event: string } & Record<string, unknown>;
    const idempotencyKey = `${payload.event}-${(payload.payload as { payment?: { entity?: { id?: string } } })?.payment?.entity?.id ?? raw.length}`;

    if (await isWebhookDuplicate('razorpay', idempotencyKey)) {
      return reply.code(200).send({ ok: true, duplicate: true });
    }

    try {
      await razorpayService.handleWebhook(payload.event, payload);
      await logWebhook('razorpay', payload.event, idempotencyKey, payload, 'processed');
      return reply.code(200).send({ ok: true });
    } catch (err) {
      await logWebhook('razorpay', payload.event, idempotencyKey, payload, 'failed', String(err));
      throw err;
    }
  });
}
