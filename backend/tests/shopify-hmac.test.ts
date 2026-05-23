import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { createHmac } from 'crypto';
import {
  computeShopifyWebhookHmac,
  verifyShopifyAppProxySignature,
  verifyShopifyWebhookHmac,
  verifyRazorpayHmac,
} from '../src/lib/shopify-hmac.js';

const SECRET = 'test_secret_key';

describe('Shopify webhook HMAC', () => {
  it('validates correct signature', () => {
    const body = Buffer.from('{"id":1}');
    const sig = computeShopifyWebhookHmac(body, SECRET);
    assert.equal(verifyShopifyWebhookHmac(body, sig, SECRET), true);
  });

  it('rejects invalid signature', () => {
    const body = Buffer.from('{"id":1}');
    assert.equal(verifyShopifyWebhookHmac(body, 'invalid', SECRET), false);
  });
});

describe('Shopify app proxy signature', () => {
  it('validates sorted query string', () => {
    const rest = {
      shop: 'morbeez.myshopify.com',
      path_prefix: '/apps/morbeez',
      timestamp: '1234567890',
    };
    const message = Object.keys(rest)
      .sort()
      .map((k) => `${k}=${rest[k as keyof typeof rest]}`)
      .join('');
    const signature = createHmac('sha256', SECRET).update(message).digest('hex');

    assert.equal(
      verifyShopifyAppProxySignature({ ...rest, signature }, SECRET),
      true
    );
  });
});

describe('Razorpay HMAC', () => {
  it('validates hex signature', () => {
    const body = Buffer.from('{"event":"payment.captured"}');
    const sig = createHmac('sha256', SECRET).update(body).digest('hex');
    assert.equal(verifyRazorpayHmac(body, sig, SECRET), true);
  });
});
