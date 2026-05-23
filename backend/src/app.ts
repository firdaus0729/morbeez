import Fastify from 'fastify';
import cors from '@fastify/cors';
import helmet from '@fastify/helmet';
import rateLimit from '@fastify/rate-limit';
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
import { registerEventHandlers } from './events/registerHandlers.js';

export async function buildApp() {
  const app = Fastify({
    logger: false,
    trustProxy: true,
  });

  await app.register(cors, {
    origin: env.NODE_ENV === 'production' ? [/morbeez\.in$/, /\.myshopify\.com$/] : true,
  });

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
  await app.register(shopifyWebhookRoutes);
  await app.register(razorpayWebhookRoutes);
  await app.register(shiprocketWebhookRoutes);
  await app.register(whatsappWebhookRoutes);
  await app.register(farmersRoutes);
  await app.register(leadsRoutes);
  await app.register(shopifyProxyRoutes);

  return app;
}
