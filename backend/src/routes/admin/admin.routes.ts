import type { FastifyInstance } from 'fastify';
import { z } from 'zod';
import { adminAuthService } from '../../services/auth/admin-auth.service.js';
import { farmersAdminService } from '../../services/admin/farmers-admin.service.js';
import { shopifyProductsService } from '../../services/shopify/shopify.products.service.js';
import { requireAdmin, requireAdminRole } from '../../middleware/adminAuth.js';

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
    const [farmers, productCount] = await Promise.all([
      farmersAdminService.list({ page: 1, limit: 1 }),
      shopifyProductsService.count(),
    ]);
    return reply.send({
      ok: true,
      stats: {
        farmers: farmers.pagination.total,
        products: productCount,
      },
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
}
