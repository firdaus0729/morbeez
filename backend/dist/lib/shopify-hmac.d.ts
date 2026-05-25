/** Shopify webhook HMAC (base64) */
export declare function computeShopifyWebhookHmac(rawBody: Buffer, secret: string): string;
export declare function verifyShopifyWebhookHmac(rawBody: Buffer, hmacHeader: string | undefined, secret: string): boolean;
/**
 * Shopify App Proxy signature (hex)
 * https://shopify.dev/docs/apps/build/online-store/app-proxies
 */
export declare function verifyShopifyAppProxySignature(query: Record<string, string | undefined>, secret: string): boolean;
/** Razorpay webhook signature (hex) */
export declare function verifyRazorpayHmac(rawBody: Buffer, signature: string | undefined, secret: string): boolean;
//# sourceMappingURL=shopify-hmac.d.ts.map