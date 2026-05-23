import { createHmac, timingSafeEqual } from 'crypto';

/** Shopify webhook HMAC (base64) */
export function computeShopifyWebhookHmac(rawBody: Buffer, secret: string): string {
  return createHmac('sha256', secret).update(rawBody).digest('base64');
}

export function verifyShopifyWebhookHmac(
  rawBody: Buffer,
  hmacHeader: string | undefined,
  secret: string
): boolean {
  if (!hmacHeader) return false;
  const digest = computeShopifyWebhookHmac(rawBody, secret);
  const a = Buffer.from(digest);
  const b = Buffer.from(hmacHeader);
  return a.length === b.length && timingSafeEqual(a, b);
}

/**
 * Shopify App Proxy signature (hex)
 * https://shopify.dev/docs/apps/build/online-store/app-proxies
 */
export function verifyShopifyAppProxySignature(
  query: Record<string, string | undefined>,
  secret: string
): boolean {
  const { signature, ...rest } = query;
  if (!signature) return false;

  const message = Object.keys(rest)
    .filter((k) => rest[k] !== undefined)
    .sort()
    .map((k) => `${k}=${rest[k]}`)
    .join('');

  const digest = createHmac('sha256', secret).update(message).digest('hex');
  const a = Buffer.from(digest, 'utf8');
  const b = Buffer.from(String(signature), 'utf8');
  return a.length === b.length && timingSafeEqual(a, b);
}

/** Razorpay webhook signature (hex) */
export function verifyRazorpayHmac(rawBody: Buffer, signature: string | undefined, secret: string): boolean {
  if (!signature) return false;
  const digest = createHmac('sha256', secret).update(rawBody).digest('hex');
  const a = Buffer.from(digest);
  const b = Buffer.from(signature);
  return a.length === b.length && timingSafeEqual(a, b);
}
