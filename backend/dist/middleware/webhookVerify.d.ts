import type { FastifyRequest } from 'fastify';
/** Shopify HMAC-SHA256 (base64) */
export declare function verifyShopifyWebhook(rawBody: Buffer, hmacHeader: string | undefined): void;
/** Razorpay X-Razorpay-Signature */
export declare function verifyRazorpayWebhook(rawBody: Buffer, signature: string | undefined): void;
/** Shopify App Proxy query signature */
export declare function verifyShopifyAppProxy(query: Record<string, string | undefined>): void;
/** Meta WhatsApp — X-Hub-Signature-256 */
export declare function verifyWhatsAppWebhook(rawBody: Buffer, signature: string | undefined): void;
export declare function verifyInternalApiKey(request: FastifyRequest): void;
//# sourceMappingURL=webhookVerify.d.ts.map