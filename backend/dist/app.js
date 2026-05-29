import Fastify from 'fastify';
import cors from '@fastify/cors';
import helmet from '@fastify/helmet';
import rateLimit from '@fastify/rate-limit';
import fastifyStatic from '@fastify/static';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { env } from './config/env.js';
import { logger } from './lib/logger.js';
import { AppError } from './lib/errors.js';
import { healthRoutes } from './routes/health.js';
import { shopifyWebhookRoutes } from './routes/webhooks/shopify.routes.js';
import { razorpayWebhookRoutes } from './routes/webhooks/razorpay.routes.js';
import { shiprocketWebhookRoutes } from './routes/webhooks/shiprocket.routes.js';
import { whatsappWebhookRoutes } from './routes/webhooks/whatsapp.routes.js';
import { farmersRoutes } from './routes/api/farmers.routes.js';
import { leadsRoutes } from './routes/api/leads.routes.js';
import { shopifyProxyRoutes } from './routes/proxy/shopify-proxy.routes.js';
import { advisoryRoutes } from './routes/api/advisory.routes.js';
import { authRoutes } from './routes/api/auth.routes.js';
import { shopifyOAuthRoutes } from './routes/auth/shopify-oauth.routes.js';
import { checkoutRoutes } from './routes/api/checkout.routes.js';
import { adminRoutes } from './routes/admin/admin.routes.js';
import { registerEventHandlers } from './events/registerHandlers.js';
import { LEGACY_CONSOLE_PATH, STAFF_API_V1, STAFF_PORTAL_PATH, STAFF_PORTAL_PREFIX, } from './lib/staff-portal.js';
const __dirname = path.dirname(fileURLToPath(import.meta.url));
const reactConsoleStaticRoot = path.join(__dirname, '../console-ui/dist');
const fieldPwaStaticRoot = path.join(__dirname, '../field-pwa/dist');
const CONSOLE_BUILD_HINT = 'React console not built. From backend/: run npm run build:console (or npm run build).';
export async function buildApp() {
    const app = Fastify({
        logger: false,
        trustProxy: true,
    });
    const corsOrigins = env.NODE_ENV === 'production'
        ? [/morbeez\.in$/, /\.myshopify\.com$/, /onrender\.com$/]
        : true;
    await app.register(cors, { origin: corsOrigins });
    await app.register(helmet, { contentSecurityPolicy: false });
    await app.register(rateLimit, {
        max: env.RATE_LIMIT_MAX,
        timeWindow: env.RATE_LIMIT_WINDOW_MS,
    });
    app.setErrorHandler((error, _request, reply) => {
        if (error instanceof AppError) {
            return reply.code(error.statusCode).send({
                error: error.code,
                message: error.message,
            });
        }
        logger.error({ err: error }, 'Unhandled error');
        return reply.code(500).send({ error: 'INTERNAL_ERROR', message: 'Internal server error' });
    });
    registerEventHandlers();
    await app.register(healthRoutes);
    await app.register(shopifyOAuthRoutes);
    await app.register(shopifyWebhookRoutes);
    await app.register(razorpayWebhookRoutes);
    await app.register(shiprocketWebhookRoutes);
    await app.register(whatsappWebhookRoutes);
    await app.register(authRoutes);
    await app.register(checkoutRoutes);
    await app.register(adminRoutes);
    const staffPrefix = STAFF_PORTAL_PREFIX;
    const consoleIndexPath = path.join(reactConsoleStaticRoot, 'index.html');
    const consoleBuilt = fs.existsSync(consoleIndexPath);
    if (consoleBuilt) {
        await app.register(fastifyStatic, {
            root: reactConsoleStaticRoot,
            prefix: staffPrefix,
            decorateReply: true,
        });
    }
    else {
        logger.warn({ path: reactConsoleStaticRoot }, CONSOLE_BUILD_HINT);
    }
    app.get(STAFF_PORTAL_PATH, async (_request, reply) => {
        if (!consoleBuilt) {
            return reply.code(503).type('text/html').send(buildMissingConsoleHtml());
        }
        return reply.redirect(staffPrefix);
    });
    if (!consoleBuilt) {
        app.get(STAFF_PORTAL_PREFIX, async (_request, reply) => reply.code(503).type('text/html').send(buildMissingConsoleHtml()));
    }
    /* Legacy /console bookmarks → morbeez-staff */
    app.get(LEGACY_CONSOLE_PATH, async (_request, reply) => {
        if (!consoleBuilt) {
            return reply.code(503).type('text/html').send(buildMissingConsoleHtml());
        }
        return reply.redirect(staffPrefix);
    });
    app.get(`${LEGACY_CONSOLE_PATH}/`, async (_request, reply) => {
        if (!consoleBuilt) {
            return reply.code(503).type('text/html').send(buildMissingConsoleHtml());
        }
        return reply.redirect(staffPrefix);
    });
    /* Shopify store owners often hit /admin — send them to Morbeez staff portal */
    app.get('/admin', async (_request, reply) => reply.redirect(staffPrefix));
    app.get('/admin/', async (_request, reply) => reply.redirect(staffPrefix));
    const fieldIndexPath = path.join(fieldPwaStaticRoot, 'index.html');
    const fieldBuilt = fs.existsSync(fieldIndexPath);
    const fieldPrefix = '/field/';
    if (fieldBuilt) {
        await app.register(fastifyStatic, {
            root: fieldPwaStaticRoot,
            prefix: fieldPrefix,
            decorateReply: false,
        });
        app.get('/field', async (_request, reply) => reply.redirect(fieldPrefix));
    }
    await app.register(farmersRoutes);
    await app.register(leadsRoutes);
    await app.register(advisoryRoutes);
    await app.register(shopifyProxyRoutes);
    app.setNotFoundHandler(async (request, reply) => {
        const url = (request.url.split('?')[0] ?? '').replace(/\/+$/, '') || '/';
        if (url.startsWith(`${STAFF_API_V1}/`) || url === STAFF_API_V1) {
            return reply.code(404).send({ error: 'NOT_FOUND', message: 'API route not found' });
        }
        if (url.startsWith(STAFF_PORTAL_PATH) || url.startsWith(LEGACY_CONSOLE_PATH)) {
            if (!consoleBuilt) {
                return reply.code(503).type('text/html').send(buildMissingConsoleHtml());
            }
            return reply.sendFile('index.html', reactConsoleStaticRoot);
        }
        if (url.startsWith('/field') && fieldBuilt) {
            return reply.sendFile('index.html', fieldPwaStaticRoot);
        }
        return reply.code(404).send({ error: 'NOT_FOUND', message: 'Not found' });
    });
    return app;
}
function buildMissingConsoleHtml() {
    return `<!DOCTYPE html><html><head><meta charset="utf-8"><title>Morbeez Console</title></head>
<body style="font-family:system-ui;padding:2rem;max-width:40rem">
<h1>Console build required</h1>
<p>${CONSOLE_BUILD_HINT}</p>
<p>Legacy <code>admin/js</code> is no longer served (Phase 8 cutover).</p>
</body></html>`;
}
//# sourceMappingURL=app.js.map