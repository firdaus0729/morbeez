import type { FastifyInstance } from 'fastify';
/**
 * Shopify App Proxy routes
 * Storefront URL: /apps/morbeez/* → https://api.../proxy/*
 * Configure in Partner Dashboard: subpath prefix `morbeez`, proxy URL your API
 */
export declare function shopifyProxyRoutes(app: FastifyInstance): Promise<void>;
//# sourceMappingURL=shopify-proxy.routes.d.ts.map