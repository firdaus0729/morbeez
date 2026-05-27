import type { FastifyInstance } from 'fastify';
import { env } from '../../config/env.js';
import { createHmac, timingSafeEqual } from 'crypto';
import { verifyWhatsAppWebhook } from '../../middleware/webhookVerify.js';
import { WebhookVerificationError } from '../../lib/errors.js';
import { isWebhookDuplicate, logWebhook } from '../../middleware/idempotency.js';
import { whatsappService } from '../../services/whatsapp/whatsapp.service.js';
import { logger } from '../../lib/logger.js';

/** Meta Cloud API webhook subscription (GET hub.challenge). */
function resolveMetaVerifyChallenge(query: Record<string, string | undefined>): string | null {
  const mode = query['hub.mode'];
  const token = query['hub.verify_token']?.trim();
  const challenge = query['hub.challenge'];
  const expected = env.WHATSAPP_VERIFY_TOKEN?.trim();

  if (!expected) {
    logger.warn('WHATSAPP_VERIFY_TOKEN is missing — set it on Render to match Meta dashboard');
    return null;
  }

  if (mode === 'subscribe' && token === expected && challenge) {
    return challenge;
  }

  if (mode === 'subscribe') {
    logger.warn(
      {
        tokenMatches: token === expected,
        hasChallenge: Boolean(challenge),
        hasVerifyToken: Boolean(token),
      },
      'Meta webhook verification failed (check WHATSAPP_VERIFY_TOKEN matches Meta Verify token)'
    );
  }

  return null;
}

export async function whatsappWebhookRoutes(app: FastifyInstance): Promise<void> {
  app.addContentTypeParser('application/json', { parseAs: 'buffer' }, (_req, body, done) => {
    done(null, body);
  });

  /** Meta verification challenge — Callback URL: https://<api>/webhooks/whatsapp */
  app.get('/webhooks/whatsapp', async (request, reply) => {
    const query = request.query as Record<string, string>;
    const challenge = resolveMetaVerifyChallenge(query);
    if (challenge !== null) {
      return reply.code(200).type('text/plain').send(challenge);
    }
    return reply.code(403).type('text/plain').send('Forbidden');
  });

  /** Ads Gyani — configure webhook URL in dashboard: https://<api>/webhooks/whatsapp/adsgyani */
  app.get('/webhooks/whatsapp/adsgyani', async (request, reply) => {
    const query = request.query as Record<string, string>;
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
    const raw = request.body as Buffer;
    verifyAdsGyaniWebhook(raw, request.headers);

    const payload = JSON.parse(raw.toString()) as Record<string, unknown>;
    const idempotencyKey =
      (payload.id != null && String(payload.id)) ||
      (payload.message_id != null && String(payload.message_id)) ||
      JSON.stringify(payload).slice(0, 128);

    if (await isWebhookDuplicate('whatsapp_adsgyani', idempotencyKey)) {
      return reply.code(200).send({ ok: true, duplicate: true });
    }

    try {
      await whatsappService.handleAdsGyaniInbound(payload);
      await logWebhook('whatsapp_adsgyani', 'messages', idempotencyKey, payload, 'processed');
      return reply.code(200).send({ ok: true });
    } catch (err) {
      await logWebhook('whatsapp_adsgyani', 'messages', idempotencyKey, payload, 'failed', String(err));
      throw err;
    }
  });

  app.post('/webhooks/whatsapp', async (request, reply) => {
    const raw = request.body as Buffer;
    const sig = request.headers['x-hub-signature-256'] as string | undefined;

    try {
      verifyWhatsAppWebhook(raw, sig);
    } catch (err) {
      logger.warn(
        { hasSignature: Boolean(sig) },
        'Meta webhook signature verification failed — check WHATSAPP_APP_SECRET on Render'
      );
      throw err;
    }

    const payload = JSON.parse(raw.toString()) as Record<string, unknown>;
    logger.info(
      {
        object: payload.object,
        entries: (payload.entry as unknown[])?.length ?? 0,
      },
      'Meta WhatsApp webhook POST received'
    );
    const idempotencyKey = JSON.stringify(
      (payload.entry as unknown[])?.[0] ?? payload
    ).slice(0, 128);

    if (await isWebhookDuplicate('whatsapp', idempotencyKey)) {
      return reply.code(200).send({ ok: true, duplicate: true });
    }

    try {
      await whatsappService.handleCloudInbound(payload);
      await logWebhook('whatsapp', 'messages', idempotencyKey, payload, 'processed');
      return reply.code(200).send({ ok: true });
    } catch (err) {
      await logWebhook('whatsapp', 'messages', idempotencyKey, payload, 'failed', String(err));
      throw err;
    }
  });
}

function verifyAdsGyaniWebhook(raw: Buffer, headers: Record<string, unknown>): void {
  const secret = env.ADS_GYANI_WEBHOOK_SECRET;
  if (!secret) return;

  const signature = headers['x-adsgyani-signature'] ?? headers['x-webhook-signature'];
  const auth = headers.authorization;
  if (typeof auth === 'string' && auth === `Bearer ${secret}`) return;

  if (typeof signature === 'string') {
    const expected = createHmac('sha256', secret).update(raw).digest('hex');
    const provided = signature.replace(/^sha256=/, '');
    const a = Buffer.from(expected);
    const b = Buffer.from(provided);
    if (a.length === b.length && timingSafeEqual(a, b)) return;
  }

  throw new WebhookVerificationError('Ads Gyani');
}
