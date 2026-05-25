import type { FastifyInstance } from 'fastify';
import { z } from 'zod';
import { adminAuthService } from '../../services/auth/admin-auth.service.js';
import { adminDashboardService } from '../../services/admin/admin-dashboard.service.js';
import { farmersAdminService } from '../../services/admin/farmers-admin.service.js';
import { ordersAdminService } from '../../services/admin/orders-admin.service.js';
import { productIntelligenceService } from '../../services/admin/product-intelligence.service.js';
import { shopifyProductsService } from '../../services/shopify/shopify.products.service.js';
import { requireAdmin, requireAdminRole } from '../../middleware/adminAuth.js';
import { supabase } from '../../lib/supabase.js';
import { throwIfSupabaseError } from '../../lib/supabase-errors.js';

const loginSchema = z.object({
  email: z.string().email().max(255),
  password: z.string().min(1).max(128),
});

const farmerUpdateSchema = z.object({
  firstName: z.string().min(1).max(80).optional(),
  lastName: z.string().min(1).max(80).optional(),
  phone: z.string().max(20).optional(),
  district: z.string().max(100).optional(),
  state: z.string().max(100).optional(),
  newsletterSubscribed: z.boolean().optional(),
});

const productCreateSchema = z.object({
  title: z.string().min(1).max(255),
  bodyHtml: z.string().max(50000).optional(),
  vendor: z.string().max(100).optional(),
  productType: z.string().max(100).optional(),
  tags: z.string().max(500).optional(),
  status: z.enum(['active', 'draft', 'archived']).optional(),
  price: z.string().optional(),
  sku: z.string().max(100).optional(),
});

const productUpdateSchema = productCreateSchema.partial();

const imageUploadSchema = z.object({
  fileName: z.string().min(1).max(255),
  mimeType: z.string().max(100).default('image/jpeg'),
  dataBase64: z.string().min(20).max(12_000_000),
  alt: z.string().max(255).optional(),
});

const jsonSection = z.record(z.unknown()).optional();

const intelligenceSchema = z.object({
  basic: jsonSection,
  agriculture: jsonSection,
  aiMapping: jsonSection,
  seo: jsonSection,
  crossSell: jsonSection,
});

export async function adminRoutes(app: FastifyInstance): Promise<void> {
  const api = '/console/api/v1';

  app.post(`${api}/auth/login`, async (request, reply) => {
    const body = loginSchema.parse(request.body);
    const result = await adminAuthService.login(body);
    return reply.send({ ok: true, ...result });
  });

  app.get(`${api}/auth/me`, async (request, reply) => {
    const admin = requireAdmin(request);
    const profile = await adminAuthService.me(admin.id);
    return reply.send({ ok: true, admin: profile });
  });

  app.get(`${api}/stats`, async (request, reply) => {
    requireAdmin(request);
    const overview = await adminDashboardService.getOverview();
    return reply.send({
      ok: true,
      stats: overview.kpis,
      overview,
    });
  });

  app.get(`${api}/dashboard`, async (request, reply) => {
    requireAdmin(request);
    const overview = await adminDashboardService.getOverview();
    return reply.send({ ok: true, ...overview });
  });

  app.get(`${api}/orders`, async (request, reply) => {
    requireAdmin(request);
    const q = request.query as { page?: string; limit?: string; search?: string };
    const result = await ordersAdminService.list({
      page: q.page ? Number(q.page) : 1,
      limit: q.limit ? Number(q.limit) : 25,
      search: q.search,
    });
    return reply.send({ ok: true, ...result });
  });

  app.get(`${api}/staff`, async (request, reply) => {
    requireAdminRole(request, 'admin');
    const { data, error } = await supabase
      .from('admin_users')
      .select('id, email, full_name, role, active, last_login_at, created_at')
      .order('created_at', { ascending: false });
    throwIfSupabaseError(error, 'Could not load staff');
    return reply.send({
      ok: true,
      staff: (data ?? []).map((u) => ({
        id: u.id,
        email: u.email,
        fullName: u.full_name,
        role: u.role,
        active: u.active,
        lastLoginAt: u.last_login_at,
        createdAt: u.created_at,
      })),
    });
  });

  app.get(`${api}/farmers`, async (request, reply) => {
    requireAdmin(request);
    const q = request.query as { page?: string; limit?: string; search?: string };
    const result = await farmersAdminService.list({
      page: q.page ? Number(q.page) : 1,
      limit: q.limit ? Number(q.limit) : 25,
      search: q.search,
    });
    return reply.send({ ok: true, ...result });
  });

  app.get(`${api}/farmers/:id`, async (request, reply) => {
    requireAdmin(request);
    const { id } = request.params as { id: string };
    const farmer = await farmersAdminService.get(id);
    return reply.send({ ok: true, farmer });
  });

  app.patch(`${api}/farmers/:id`, async (request, reply) => {
    requireAdminRole(request, 'admin', 'manager');
    const { id } = request.params as { id: string };
    const body = farmerUpdateSchema.parse(request.body);
    const farmer = await farmersAdminService.update(id, body);
    return reply.send({ ok: true, farmer });
  });

  app.get(`${api}/products`, async (request, reply) => {
    requireAdmin(request);
    const q = request.query as { page?: string; limit?: string; search?: string };
    const result = await shopifyProductsService.list({
      page: q.page ? Number(q.page) : 1,
      limit: q.limit ? Number(q.limit) : 25,
      search: q.search,
    });
    return reply.send({ ok: true, ...result });
  });

  app.get(`${api}/products/:id`, async (request, reply) => {
    requireAdmin(request);
    const { id } = request.params as { id: string };
    const product = await shopifyProductsService.get(id);
    return reply.send({ ok: true, product });
  });

  app.post(`${api}/products`, async (request, reply) => {
    requireAdminRole(request, 'admin', 'manager');
    const body = productCreateSchema.parse(request.body);
    const product = await shopifyProductsService.create(body);
    return reply.code(201).send({ ok: true, product });
  });

  app.put(`${api}/products/:id`, async (request, reply) => {
    requireAdminRole(request, 'admin', 'manager');
    const { id } = request.params as { id: string };
    const body = productUpdateSchema.parse(request.body);
    const product = await shopifyProductsService.update(id, body);
    return reply.send({ ok: true, product });
  });

  app.post(`${api}/products/:id/images`, async (request, reply) => {
    requireAdminRole(request, 'admin', 'manager');
    const { id } = request.params as { id: string };
    const body = imageUploadSchema.parse(request.body);
    const image = await shopifyProductsService.uploadImage(id, body);
    return reply.code(201).send({ ok: true, image });
  });

  app.delete(`${api}/products/:id/images/:imageId`, async (request, reply) => {
    requireAdminRole(request, 'admin', 'manager');
    const { id, imageId } = request.params as { id: string; imageId: string };
    await shopifyProductsService.deleteImage(id, imageId);
    return reply.send({ ok: true });
  });

  app.get(`${api}/products/:id/intelligence`, async (request, reply) => {
    requireAdmin(request);
    const { id } = request.params as { id: string };
    const intelligence = await productIntelligenceService.get(id);
    return reply.send({ ok: true, intelligence });
  });

  app.put(`${api}/products/:id/intelligence`, async (request, reply) => {
    requireAdminRole(request, 'admin', 'manager');
    const admin = requireAdmin(request);
    const { id } = request.params as { id: string };
    const body = intelligenceSchema.parse(request.body);
    const intelligence = await productIntelligenceService.upsert(
      id,
      {
        basic: body.basic,
        agriculture: body.agriculture,
        ai_mapping: body.aiMapping,
        seo: body.seo,
        cross_sell: body.crossSell,
      },
      admin.id
    );
    return reply.send({ ok: true, intelligence });
  });
}
