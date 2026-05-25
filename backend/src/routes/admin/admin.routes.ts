import type { FastifyInstance } from 'fastify';
import { z } from 'zod';
import { adminAuthService } from '../../services/auth/admin-auth.service.js';
import { adminDashboardService } from '../../services/admin/admin-dashboard.service.js';
import { farmersAdminService } from '../../services/admin/farmers-admin.service.js';
import { ordersAdminService } from '../../services/admin/orders-admin.service.js';
import { inventoryAdminService } from '../../services/admin/inventory-admin.service.js';
import { offersAdminService } from '../../services/admin/offers-admin.service.js';
import { combosAdminService } from '../../services/admin/combos-admin.service.js';
import { flashSalesAdminService } from '../../services/admin/flash-sales-admin.service.js';
import { aiAdvisoryAdminService } from '../../services/admin/ai-advisory-admin.service.js';
import { aiMappingAdminService } from '../../services/admin/ai-mapping-admin.service.js';
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

const farmerCreateSchema = z.object({
  phone: z.string().min(10).max(20),
  name: z.string().max(120).optional(),
  firstName: z.string().max(80).optional(),
  lastName: z.string().max(80).optional(),
  state: z.string().max(100).optional(),
  district: z.string().max(100).optional(),
  crops: z.string().max(500).optional(),
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

const wizardVariantSchema = z.object({
  id: z.string().optional(),
  packSize: z.string().min(1).max(20),
  unit: z.string().min(1).max(10),
  mrp: z.string().max(20),
  sellingPrice: z.string().max(20),
  dealerPrice: z.string().max(20).optional(),
  stock: z.number().int().min(0).max(999999),
  sku: z.string().max(100).optional(),
});

const wizardSaveSchema = z.object({
  title: z.string().min(1).max(255),
  bodyHtml: z.string().max(50000).optional(),
  vendor: z.string().max(100).optional(),
  productType: z.string().max(100).optional(),
  tags: z.string().max(500).optional(),
  status: z.enum(['active', 'draft', 'archived']).optional(),
  skuPrefix: z.string().max(20).optional(),
  variants: z.array(wizardVariantSchema).min(1).max(30),
  intelligence: intelligenceSchema,
});

const offerCreateSchema = z.object({
  name: z.string().min(1).max(120),
  offerType: z.enum(['percentage', 'combo', 'flat']),
  discountLabel: z.string().min(1).max(80),
  minOrderAmount: z.number().min(0).max(9999999),
  startsAt: z.string().min(1),
  endsAt: z.string().min(1),
  description: z.string().max(500).optional(),
});

const couponCreateSchema = z.object({
  code: z.string().min(3).max(24),
  discountLabel: z.string().min(1).max(80),
  minOrderAmount: z.number().min(0).max(9999999),
  usageLimit: z.number().int().min(1).max(999999),
  validUntil: z.string().min(1),
});

const comboCreateSchema = z.object({
  name: z.string().min(1).max(120),
  productCount: z.number().int().min(1).max(50),
  mrp: z.number().min(0).max(9999999),
  comboPrice: z.number().min(0).max(9999999),
  status: z.enum(['active', 'inactive']).optional(),
  description: z.string().max(500).optional(),
  products: z
    .array(z.object({ title: z.string().max(200), quantity: z.number().int().min(1).optional() }))
    .optional(),
});

const comboUpdateSchema = comboCreateSchema.partial();

const listMappingSchema = z.object({
  items: z.array(z.string().min(1).max(80)).max(50),
});

const cropMappingSchema = z.object({
  crops: z.array(z.string().min(1).max(80)).max(50),
});

const pestMappingSchema = z.object({
  pests: z.array(z.string().min(1).max(80)).max(50),
});

const flashSaleCreateSchema = z.object({
  productName: z.string().min(1).max(200),
  imageUrl: z.string().max(500).optional(),
  flashPrice: z.number().min(0).max(9999999),
  originalPrice: z.number().min(0).max(9999999),
  startsAt: z.string().min(1),
  endsAt: z.string().min(1),
  stockTotal: z.number().int().min(1).max(999999),
  description: z.string().max(500).optional(),
  shopifyProductId: z.string().max(50).optional(),
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
    const q = request.query as {
      page?: string;
      limit?: string;
      search?: string;
      status?: string;
      payment?: string;
    };
    const status =
      q.status === 'pending' ||
      q.status === 'processing' ||
      q.status === 'shipped' ||
      q.status === 'delivered' ||
      q.status === 'cancelled'
        ? q.status
        : 'all';
    const payment = q.payment === 'cod' || q.payment === 'paid' ? q.payment : '';
    const result = await ordersAdminService.list({
      page: q.page ? Number(q.page) : 1,
      limit: q.limit ? Number(q.limit) : 8,
      search: q.search,
      status,
      payment,
    });
    return reply.send({ ok: true, ...result });
  });

  app.get(`${api}/orders/:id`, async (request, reply) => {
    requireAdmin(request);
    const { id } = request.params as { id: string };
    const order = await ordersAdminService.get(id);
    return reply.send({ ok: true, order });
  });

  app.get(`${api}/offers`, async (request, reply) => {
    requireAdmin(request);
    const q = request.query as { tab?: string };
    const tab =
      q.tab === 'active' || q.tab === 'upcoming' || q.tab === 'expired' ? q.tab : 'all';
    const result = await offersAdminService.listOffers({ tab });
    return reply.send({ ok: true, ...result });
  });

  app.get(`${api}/offers/:id`, async (request, reply) => {
    requireAdmin(request);
    const { id } = request.params as { id: string };
    const offer = await offersAdminService.getOffer(id);
    return reply.send({ ok: true, offer });
  });

  app.post(`${api}/offers`, async (request, reply) => {
    requireAdminRole(request, 'admin', 'manager');
    const body = offerCreateSchema.parse(request.body);
    const offer = await offersAdminService.createOffer(body);
    return reply.status(201).send({ ok: true, offer });
  });

  app.get(`${api}/coupons`, async (request, reply) => {
    requireAdmin(request);
    const result = await offersAdminService.listCoupons();
    return reply.send({ ok: true, ...result });
  });

  app.get(`${api}/coupons/:id`, async (request, reply) => {
    requireAdmin(request);
    const { id } = request.params as { id: string };
    const coupon = await offersAdminService.getCoupon(id);
    return reply.send({ ok: true, coupon });
  });

  app.post(`${api}/coupons`, async (request, reply) => {
    requireAdminRole(request, 'admin', 'manager');
    const body = couponCreateSchema.parse(request.body);
    const coupon = await offersAdminService.createCoupon(body);
    return reply.status(201).send({ ok: true, coupon });
  });

  app.get(`${api}/combos`, async (request, reply) => {
    requireAdmin(request);
    const q = request.query as {
      page?: string;
      limit?: string;
      search?: string;
      status?: string;
    };
    const status =
      q.status === 'active' || q.status === 'inactive' ? q.status : 'all';
    const result = await combosAdminService.list({
      page: q.page ? Number(q.page) : 1,
      limit: q.limit ? Number(q.limit) : 7,
      search: q.search,
      status,
    });
    return reply.send({ ok: true, ...result });
  });

  app.get(`${api}/combos/:id`, async (request, reply) => {
    requireAdmin(request);
    const { id } = request.params as { id: string };
    const combo = await combosAdminService.get(id);
    return reply.send({ ok: true, combo });
  });

  app.post(`${api}/combos`, async (request, reply) => {
    requireAdminRole(request, 'admin', 'manager');
    const body = comboCreateSchema.parse(request.body);
    const combo = await combosAdminService.create(body);
    return reply.status(201).send({ ok: true, combo });
  });

  app.patch(`${api}/combos/:id`, async (request, reply) => {
    requireAdminRole(request, 'admin', 'manager');
    const { id } = request.params as { id: string };
    const body = comboUpdateSchema.parse(request.body);
    const combo = await combosAdminService.update(id, body);
    return reply.send({ ok: true, combo });
  });

  app.get(`${api}/flash-sales`, async (request, reply) => {
    requireAdmin(request);
    const q = request.query as { tab?: string; page?: string; limit?: string };
    const tab =
      q.tab === 'live' || q.tab === 'upcoming' || q.tab === 'completed' ? q.tab : 'all';
    const result = await flashSalesAdminService.list({
      tab,
      page: q.page ? Number(q.page) : 1,
      limit: q.limit ? Number(q.limit) : 4,
    });
    return reply.send({ ok: true, ...result });
  });

  app.get(`${api}/flash-sales/:id`, async (request, reply) => {
    requireAdmin(request);
    const { id } = request.params as { id: string };
    const sale = await flashSalesAdminService.get(id);
    return reply.send({ ok: true, sale });
  });

  app.post(`${api}/flash-sales`, async (request, reply) => {
    requireAdminRole(request, 'admin', 'manager');
    const body = flashSaleCreateSchema.parse(request.body);
    const sale = await flashSalesAdminService.create({
      ...body,
      imageUrl: body.imageUrl || undefined,
    });
    return reply.status(201).send({ ok: true, sale });
  });

  app.get(`${api}/ai-advisory/overview`, async (request, reply) => {
    requireAdmin(request);
    const overview = await aiAdvisoryAdminService.getOverview();
    return reply.send({ ok: true, ...overview });
  });

  app.get(`${api}/ai-advisory/logs`, async (request, reply) => {
    requireAdmin(request);
    const q = request.query as { page?: string; limit?: string };
    const result = await aiAdvisoryAdminService.listLogs({
      page: q.page ? Number(q.page) : 1,
      limit: q.limit ? Number(q.limit) : 15,
    });
    return reply.send({ ok: true, ...result });
  });

  app.get(`${api}/ai-mapping`, async (request, reply) => {
    requireAdmin(request);
    const q = request.query as {
      tab?: string;
      page?: string;
      limit?: string;
      search?: string;
      filter?: string;
    };
    const tab =
      q.tab === 'pest' ||
      q.tab === 'disease' ||
      q.tab === 'symptom' ||
      q.tab === 'usage'
        ? q.tab
        : 'crop';
    const filter = q.filter === 'mapped' || q.filter === 'unmapped' ? q.filter : '';
    const result = await aiMappingAdminService.list({
      tab,
      page: q.page ? Number(q.page) : 1,
      limit: q.limit ? Number(q.limit) : 7,
      search: q.search,
      filter,
    });
    return reply.send({ ok: true, ...result });
  });

  app.get(`${api}/ai-mapping/product-options`, async (request, reply) => {
    requireAdmin(request);
    const q = request.query as { search?: string };
    const products = await aiMappingAdminService.listProductOptions(q.search);
    return reply.send({ ok: true, products });
  });

  app.patch(`${api}/ai-mapping/products/:productId/crops`, async (request, reply) => {
    requireAdminRole(request, 'admin', 'manager');
    const admin = requireAdmin(request);
    const { productId } = request.params as { productId: string };
    const body = cropMappingSchema.parse(request.body);
    const intel = await aiMappingAdminService.updateCropMapping(
      productId,
      body.crops,
      admin.id
    );
    return reply.send({ ok: true, intelligence: intel });
  });

  app.patch(`${api}/ai-mapping/products/:productId/pests`, async (request, reply) => {
    requireAdminRole(request, 'admin', 'manager');
    const admin = requireAdmin(request);
    const { productId } = request.params as { productId: string };
    const body = pestMappingSchema.parse(request.body);
    const intel = await aiMappingAdminService.updatePestMapping(
      productId,
      body.pests,
      admin.id
    );
    return reply.send({ ok: true, intelligence: intel });
  });

  app.patch(`${api}/ai-mapping/products/:productId/diseases`, async (request, reply) => {
    requireAdminRole(request, 'admin', 'manager');
    const admin = requireAdmin(request);
    const { productId } = request.params as { productId: string };
    const body = z.object({ diseases: listMappingSchema.shape.items }).parse(request.body);
    const intel = await aiMappingAdminService.updateDiseaseMapping(
      productId,
      body.diseases,
      admin.id
    );
    return reply.send({ ok: true, intelligence: intel });
  });

  app.patch(`${api}/ai-mapping/products/:productId/symptoms`, async (request, reply) => {
    requireAdminRole(request, 'admin', 'manager');
    const admin = requireAdmin(request);
    const { productId } = request.params as { productId: string };
    const body = z.object({ symptoms: listMappingSchema.shape.items }).parse(request.body);
    const intel = await aiMappingAdminService.updateSymptomMapping(
      productId,
      body.symptoms,
      admin.id
    );
    return reply.send({ ok: true, intelligence: intel });
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
    const q = request.query as {
      page?: string;
      limit?: string;
      search?: string;
      status?: string;
      state?: string;
    };
    const status =
      q.status === 'active' || q.status === 'inactive' ? q.status : ('all' as const);
    const result = await farmersAdminService.list({
      page: q.page ? Number(q.page) : 1,
      limit: q.limit ? Number(q.limit) : 8,
      search: q.search,
      status,
      state: q.state,
    });
    return reply.send({ ok: true, ...result });
  });

  app.get(`${api}/farmers/states`, async (request, reply) => {
    requireAdmin(request);
    const states = await farmersAdminService.listStates();
    return reply.send({ ok: true, states });
  });

  app.post(`${api}/farmers`, async (request, reply) => {
    requireAdminRole(request, 'admin', 'manager');
    const body = farmerCreateSchema.parse(request.body);
    const { farmer } = await farmersAdminService.create(body);
    return reply.status(201).send({ ok: true, farmer });
  });

  app.get(`${api}/farmers/:id`, async (request, reply) => {
    requireAdmin(request);
    const { id } = request.params as { id: string };
    const { farmer } = await farmersAdminService.get(id);
    return reply.send({ ok: true, farmer });
  });

  app.patch(`${api}/farmers/:id`, async (request, reply) => {
    requireAdminRole(request, 'admin', 'manager');
    const { id } = request.params as { id: string };
    const body = farmerUpdateSchema.parse(request.body);
    const farmer = await farmersAdminService.update(id, body);
    return reply.send({ ok: true, farmer });
  });

  app.get(`${api}/inventory`, async (request, reply) => {
    requireAdmin(request);
    const q = request.query as {
      page?: string;
      limit?: string;
      search?: string;
      status?: string;
    };
    const status =
      q.status === 'in_stock' || q.status === 'low_stock' || q.status === 'out_of_stock'
        ? q.status
        : 'all';
    const result = await inventoryAdminService.list({
      page: q.page ? Number(q.page) : 1,
      limit: q.limit ? Number(q.limit) : 8,
      search: q.search,
      status,
    });
    return reply.send({ ok: true, ...result });
  });

  app.get(`${api}/products`, async (request, reply) => {
    requireAdmin(request);
    const q = request.query as {
      page?: string;
      limit?: string;
      search?: string;
      category?: string;
      status?: string;
    };
    const result = await shopifyProductsService.list({
      page: q.page ? Number(q.page) : 1,
      limit: q.limit ? Number(q.limit) : 8,
      search: q.search,
      category: q.category,
      status: q.status,
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

  app.post(`${api}/products/wizard`, async (request, reply) => {
    requireAdminRole(request, 'admin', 'manager');
    const admin = requireAdmin(request);
    const body = wizardSaveSchema.parse(request.body);
    const product = await shopifyProductsService.saveWizard(null, body);
    await productIntelligenceService.upsert(
      product.id,
      {
        basic: body.intelligence.basic,
        agriculture: body.intelligence.agriculture,
        ai_mapping: body.intelligence.aiMapping,
        seo: body.intelligence.seo,
        cross_sell: body.intelligence.crossSell,
      },
      admin.id
    );
    return reply.code(201).send({ ok: true, product });
  });

  app.put(`${api}/products/:id/wizard`, async (request, reply) => {
    requireAdminRole(request, 'admin', 'manager');
    const admin = requireAdmin(request);
    const { id } = request.params as { id: string };
    const body = wizardSaveSchema.parse(request.body);
    const product = await shopifyProductsService.saveWizard(id, body);
    await productIntelligenceService.upsert(
      id,
      {
        basic: body.intelligence.basic,
        agriculture: body.intelligence.agriculture,
        ai_mapping: body.intelligence.aiMapping,
        seo: body.intelligence.seo,
        cross_sell: body.intelligence.crossSell,
      },
      admin.id
    );
    return reply.send({ ok: true, product });
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
