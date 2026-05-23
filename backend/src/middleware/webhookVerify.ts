import { createHmac, timingSafeEqual } from 'crypto';
import type { FastifyRequest } from 'fastify';
import { env } from '../config/env.js';
import { UnauthorizedError, WebhookVerificationError } from '../lib/errors.js';
import {
  verifyRazorpayHmac,
  verifyShopifyAppProxySignature,
  verifyShopifyWebhookHmac,
} from '../lib/shopify-hmac.js';

/** Shopify HMAC-SHA256 (base64) */
export function verifyShopifyWebhook(rawBody: Buffer, hmacHeader: string | undefined): void {
  if (!verifyShopifyWebhookHmac(rawBody, hmacHeader, env.SHOPIFY_WEBHOOK_SECRET)) {
    throw new WebhookVerificationError('Shopify');
  }
}

/** Razorpay X-Razorpay-Signature */
export function verifyRazorpayWebhook(rawBody: Buffer, signature: string | undefined): void {
  if (!env.RAZORPAY_WEBHOOK_SECRET || !signature) {
    throw new WebhookVerificationError('Razorpay');
  }
  if (!verifyRazorpayHmac(rawBody, signature, env.RAZORPAY_WEBHOOK_SECRET)) {
    throw new WebhookVerificationError('Razorpay');
  }
}

/** Shopify App Proxy query signature */
export function verifyShopifyAppProxy(query: Record<string, string | undefined>): void {
  const secret = env.SHOPIFY_APP_CLIENT_SECRET ?? env.SHOPIFY_WEBHOOK_SECRET;
  if (!verifyShopifyAppProxySignature(query, secret)) {
    throw new WebhookVerificationError('Shopify App Proxy');
  }
}

/** Meta WhatsApp — X-Hub-Signature-256 */
export function verifyWhatsAppWebhook(rawBody: Buffer, signature: string | undefined): void {
  if (!env.WHATSAPP_APP_SECRET || !signature) {
    throw new WebhookVerificationError('WhatsApp');
  }
  const expected = 'sha256=' + createHmac('sha256', env.WHATSAPP_APP_SECRET).update(rawBody).digest('hex');
  const a = Buffer.from(expected);
  const b = Buffer.from(signature);
  if (a.length !== b.length || !timingSafeEqual(a, b)) {
    throw new WebhookVerificationError('WhatsApp');
  }
}

export function verifyInternalApiKey(request: FastifyRequest): void {
  const key = request.headers['x-api-key'];
  if (key !== env.INTERNAL_API_KEY) {
    throw new UnauthorizedError('Invalid API key');
  }
}
