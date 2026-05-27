import type { FastifyInstance } from 'fastify';
/**
 * Shopify Partner app install / OAuth callbacks.
 * Configure in Partner Dashboard (app version):
 *   App URL: https://YOUR_API/auth/shopify/installed
 *   Allowed redirection URL: https://YOUR_API/auth/shopify/callback
 */
export declare function shopifyOAuthRoutes(app: FastifyInstance): Promise<void>;
//# sourceMappingURL=shopify-oauth.routes.d.ts.map