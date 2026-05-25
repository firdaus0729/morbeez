import type { FastifyInstance } from 'fastify';
import { z } from 'zod';
import { verifyShopifyAppProxy } from '../../middleware/webhookVerify.js';
import { leadService } from '../../services/crm/lead.service.js';
import { farmerAuthService } from '../../services/auth/farmer-auth.service.js';
import { getBearerToken, verifyFarmerToken } from '../../lib/jwt.js';
import { UnauthorizedError } from '../../lib/errors.js';

const leadBodySchema = z.object({
  name: z.string().min(1).max(120),
  phone: z.string().min(10).max(15),
  district: z.string().optional(),
  state: z.string().optional(),
  cropType: z.string().optional(),
  notes: z.string().max(1000).optional(),
  intent: z.enum(['dealer', 'quotation', 'callback', 'support', 'general']).default('dealer'),
});

/**
 * Shopify App Proxy routes
 * Storefront URL: /apps/morbeez/* → https://api.../proxy/*
 * Configure in Partner Dashboard: subpath prefix `morbeez`, proxy URL your API
 */
export async function shopifyProxyRoutes(app: FastifyInstance): Promise<void> {
  app.addHook('preHandler', async (request) => {
    verifyShopifyAppProxy(request.query as Record<string, string | undefined>);
  });

  app.post('/proxy/advisory/diagnose', async (request, reply) => {
    const body = z
      .object({
        phone: z.string().min(10),
        name: z.string().optional(),
        cropType: z.string().default('ginger'),
        cropStage: z.string().optional(),
        language: z.enum(['en', 'ml']).default('en'),
        symptomsText: z.string().max(2000).optional(),
        imageBase64: z.string().optional(),
        imageMimeType: z.string().optional(),
      })
      .parse(request.body);

    const { cropDoctorService } = await import('../../services/ai/crop-doctor.service.js');
    const result = await cropDoctorService.diagnoseByPhone({
      ...body,
      channel: 'web',
    });

    const summary =
      body.language === 'ml' ? result.advisory.farmerSummaryMl : result.advisory.farmerSummaryEn;

    return reply.code(201).send({
      ok: true,
      sessionId: result.sessionId,
      summary,
      escalated: result.escalated,
      products: result.productRecommendations,
      disclaimer: 'AI-assisted recommendation with agronomist support available.',
    });
  });

  app.post('/proxy/leads', async (request, reply) => {
    const body = leadBodySchema.parse(request.body);
    const result = await leadService.createLead({
      ...body,
      source: 'web',
    });
    return reply.code(201).send({
      ok: true,
      leadId: result.lead.id,
      message: 'Thank you. Our team will contact you shortly.',
    });
  });

  app.get('/proxy/health', async () => ({ ok: true, proxy: 'morbeez' }));

  const signupSchema = z.object({
    email: z.string().email().max(255),
    firstName: z.string().min(1).max(80),
    lastName: z.string().min(1).max(80),
    password: z.string().min(8).max(128),
    acceptTerms: z.literal(true),
    newsletter: z.boolean().default(false),
  });

  const loginSchema = z.object({
    email: z.string().email().max(255),
    password: z.string().min(1).max(128),
  });

  app.post('/proxy/auth/signup', async (request, reply) => {
    const body = signupSchema.parse(request.body);
    const result = await farmerAuthService.signup(body);
    return reply.code(201).send({ ok: true, ...result });
  });

  app.post('/proxy/auth/login', async (request, reply) => {
    const body = loginSchema.parse(request.body);
    const result = await farmerAuthService.login(body);
    return reply.send({ ok: true, ...result });
  });

  app.get('/proxy/auth/me', async (request, reply) => {
    const token = getBearerToken(request.headers.authorization);
    if (!token) throw new UnauthorizedError('Not signed in');
    const payload = verifyFarmerToken(token);
    const farmer = await farmerAuthService.me(payload.sub);
    return reply.send({ ok: true, farmer });
  });
}
