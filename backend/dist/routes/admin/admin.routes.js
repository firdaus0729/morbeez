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
import { telecallerAdminService } from '../../services/admin/telecaller-admin.service.js';
import { escalationAdminService } from '../../services/admin/escalation-admin.service.js';
import { crmFarmerService } from '../../services/admin/crm-farmer.service.js';
import { consoleSearchService } from '../../services/admin/console-search.service.js';
import { productIntelligenceService } from '../../services/admin/product-intelligence.service.js';
import { shopifyProductsService } from '../../services/shopify/shopify.products.service.js';
import { whatsappOsAdminService } from '../../services/admin/whatsapp-os-admin.service.js';
import { whatsappBroadcastAdminService } from '../../services/admin/whatsapp-broadcast-admin.service.js';
import { crmInternalNotesService } from '../../services/admin/crm-internal-notes.service.js';
import { osFoundationRoutes } from './os-foundation.routes.js';
import { osOperationsRoutes } from './os-operations.routes.js';
import { osTelecallerRoutes } from './os-telecaller.routes.js';
import { osIntelligenceRoutes } from './os-intelligence.routes.js';
import { osAgronomistRoutes } from './os-agronomist.routes.js';
import { osFieldRoutes } from './os-field.routes.js';
import { osAnalyticsRoutes } from './os-analytics.routes.js';
import { osSettingsRoutes } from './os-settings.routes.js';
import { getModulesForRole, canApproveRecommendations, assertStaffManagement, assertCanAssignRole, } from '../../lib/rbac.js';
import { CONSOLE_ROLES } from '../../lib/console-roles.js';
import { requireAdmin, requireAdminRole } from '../../middleware/adminAuth.js';
import { supabase } from '../../lib/supabase.js';
import { throwIfSupabaseError } from '../../lib/supabase-errors.js';
import { hashPassword, verifyPassword } from '../../lib/password.js';
import { logAdminMutation } from '../../lib/admin-mutation-audit.js';
import { assertSuperAdminDeactivationAllowed } from '../../lib/admin-guards.js';
import { employeeProfileService } from '../../services/admin/employee-profile.service.js';
import { employeeAccessService } from '../../services/admin/employee-access.service.js';
import { staffInviteService } from '../../services/admin/staff-invite.service.js';
import { employeeReassignmentService } from '../../services/admin/employee-reassignment.service.js';
import { attendanceCalculatorService } from '../../services/admin/attendance-calculator.service.js';
import { incentiveCalculatorService } from '../../services/admin/incentive-calculator.service.js';
import { payrollGeneratorService } from '../../services/admin/payroll-generator.service.js';
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
async function assertCanDeactivateSuperAdmin(userId) {
    const { data, error } = await supabase
        .from('admin_users')
        .select('id, role, active')
        .eq('id', userId)
        .maybeSingle();
    throwIfSupabaseError(error, 'Could not validate admin account');
    if (!data || data.role !== 'super_admin' || data.active === false)
        return;
    const { count, error: countError } = await supabase
        .from('admin_users')
        .select('id', { count: 'exact', head: true })
        .eq('role', 'super_admin')
        .eq('active', true);
    throwIfSupabaseError(countError, 'Could not validate super admin guard');
    assertSuperAdminDeactivationAllowed({
        role: data.role,
        active: Boolean(data.active),
        activeSuperAdminCount: count ?? 0,
    });
}
export async function adminRoutes(app) {
    const api = '/morbeez-staff/api/v1';
    app.post(`${api}/auth/login`, async (request, reply) => {
        const body = loginSchema.parse(request.body);
        const result = await adminAuthService.login(body);
        return reply.send({ ok: true, ...result });
    });
    app.get(`${api}/auth/me`, async (request, reply) => {
        const admin = requireAdmin(request);
        const profile = await adminAuthService.me(admin.id);
        const role = String(profile.role);
        const modules = await getModulesForRole(role);
        return reply.send({
            ok: true,
            admin: profile,
            modules,
            canApproveRecommendations: canApproveRecommendations(role),
        });
    });
    app.get(`${api}/auth/invite`, async (request, reply) => {
        const query = z.object({ token: z.string().min(16) }).parse(request.query ?? {});
        const invite = await staffInviteService.previewToken(query.token);
        return reply.send({ ok: true, invite });
    });
    app.post(`${api}/auth/complete-invite`, async (request, reply) => {
        const body = z
            .object({
            token: z.string().min(16),
            password: z.string().min(8).max(128),
        })
            .parse(request.body);
        const result = await staffInviteService.completeInvite(body);
        return reply.send({ ok: true, email: result.email });
    });
    app.post(`${api}/auth/setup-password`, async (request, reply) => {
        const body = z
            .object({
            token: z.string().min(16),
            password: z.string().min(8).max(128),
        })
            .parse(request.body);
        await staffInviteService.completeInvite(body);
        return reply.send({ ok: true });
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
        const q = request.query;
        const status = q.status === 'pending' ||
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
        const { id } = request.params;
        const order = await ordersAdminService.get(id);
        return reply.send({ ok: true, order });
    });
    app.delete(`${api}/orders/:id`, async (request, reply) => {
        requireAdminRole(request, 'super_admin', 'admin', 'manager');
        const actor = requireAdmin(request);
        const { id } = request.params;
        const q = request.query;
        const now = new Date().toISOString();
        if (q.source === 'razorpay_checkout') {
            const { error } = await supabase
                .from('checkout_sessions')
                .update({ status: 'cancelled', updated_at: now })
                .eq('id', id);
            throwIfSupabaseError(error, 'Could not cancel order');
            await logAdminMutation({
                actorId: actor.id,
                actorEmail: actor.email,
                action: 'archive',
                resource: 'checkout_sessions',
                resourceId: id,
            });
            return reply.send({ ok: true });
        }
        const { error } = await supabase
            .from('commerce_orders')
            .update({
            payment_status: 'cancelled',
            fulfillment_status: 'cancelled',
            financial_status: 'voided',
            updated_at: now,
        })
            .eq('id', id);
        throwIfSupabaseError(error, 'Could not cancel order');
        await logAdminMutation({
            actorId: actor.id,
            actorEmail: actor.email,
            action: 'archive',
            resource: 'commerce_orders',
            resourceId: id,
        });
        return reply.send({ ok: true });
    });
    app.get(`${api}/offers`, async (request, reply) => {
        requireAdmin(request);
        const q = request.query;
        const tab = q.tab === 'active' || q.tab === 'upcoming' || q.tab === 'expired' ? q.tab : 'all';
        const result = await offersAdminService.listOffers({ tab });
        return reply.send({ ok: true, ...result });
    });
    app.get(`${api}/offers/:id`, async (request, reply) => {
        requireAdmin(request);
        const { id } = request.params;
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
        const { id } = request.params;
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
        const q = request.query;
        const status = q.status === 'active' || q.status === 'inactive' ? q.status : 'all';
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
        const { id } = request.params;
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
        const { id } = request.params;
        const body = comboUpdateSchema.parse(request.body);
        const combo = await combosAdminService.update(id, body);
        return reply.send({ ok: true, combo });
    });
    app.get(`${api}/flash-sales`, async (request, reply) => {
        requireAdmin(request);
        const q = request.query;
        const tab = q.tab === 'live' || q.tab === 'upcoming' || q.tab === 'completed' ? q.tab : 'all';
        const result = await flashSalesAdminService.list({
            tab,
            page: q.page ? Number(q.page) : 1,
            limit: q.limit ? Number(q.limit) : 4,
        });
        return reply.send({ ok: true, ...result });
    });
    app.get(`${api}/flash-sales/:id`, async (request, reply) => {
        requireAdmin(request);
        const { id } = request.params;
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
        const q = request.query;
        const result = await aiAdvisoryAdminService.listLogs({
            page: q.page ? Number(q.page) : 1,
            limit: q.limit ? Number(q.limit) : 15,
        });
        return reply.send({ ok: true, ...result });
    });
    app.get(`${api}/ai-mapping`, async (request, reply) => {
        requireAdmin(request);
        const q = request.query;
        const tab = q.tab === 'pest' ||
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
        const q = request.query;
        const products = await aiMappingAdminService.listProductOptions(q.search);
        return reply.send({ ok: true, products });
    });
    app.patch(`${api}/ai-mapping/products/:productId/crops`, async (request, reply) => {
        requireAdminRole(request, 'admin', 'manager');
        const admin = requireAdmin(request);
        const { productId } = request.params;
        const body = cropMappingSchema.parse(request.body);
        const intel = await aiMappingAdminService.updateCropMapping(productId, body.crops, admin.id);
        return reply.send({ ok: true, intelligence: intel });
    });
    app.patch(`${api}/ai-mapping/products/:productId/pests`, async (request, reply) => {
        requireAdminRole(request, 'admin', 'manager');
        const admin = requireAdmin(request);
        const { productId } = request.params;
        const body = pestMappingSchema.parse(request.body);
        const intel = await aiMappingAdminService.updatePestMapping(productId, body.pests, admin.id);
        return reply.send({ ok: true, intelligence: intel });
    });
    app.patch(`${api}/ai-mapping/products/:productId/diseases`, async (request, reply) => {
        requireAdminRole(request, 'admin', 'manager');
        const admin = requireAdmin(request);
        const { productId } = request.params;
        const body = z.object({ diseases: listMappingSchema.shape.items }).parse(request.body);
        const intel = await aiMappingAdminService.updateDiseaseMapping(productId, body.diseases, admin.id);
        return reply.send({ ok: true, intelligence: intel });
    });
    app.patch(`${api}/ai-mapping/products/:productId/symptoms`, async (request, reply) => {
        requireAdminRole(request, 'admin', 'manager');
        const admin = requireAdmin(request);
        const { productId } = request.params;
        const body = z.object({ symptoms: listMappingSchema.shape.items }).parse(request.body);
        const intel = await aiMappingAdminService.updateSymptomMapping(productId, body.symptoms, admin.id);
        return reply.send({ ok: true, intelligence: intel });
    });
    app.get(`${api}/staff`, async (request, reply) => {
        requireAdminRole(request, 'super_admin', 'admin');
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
    app.post(`${api}/staff`, async (request, reply) => {
        assertStaffManagement(request);
        const body = z
            .object({
            email: z.string().email().max(255),
            fullName: z.string().min(2).max(120),
            role: z.enum(CONSOLE_ROLES).default('viewer'),
            password: z.string().min(8).max(128),
            active: z.boolean().optional(),
        })
            .parse(request.body);
        assertCanAssignRole(request, body.role);
        const email = body.email.trim().toLowerCase();
        const now = new Date().toISOString();
        const { data, error } = await supabase
            .from('admin_users')
            .insert({
            email,
            full_name: body.fullName.trim(),
            role: body.role,
            password_hash: hashPassword(body.password),
            active: body.active ?? true,
            email_verified_at: now,
            updated_at: now,
        })
            .select('id, email, full_name, role, active, last_login_at, created_at')
            .single();
        throwIfSupabaseError(error, 'Could not create employee');
        if (!data) {
            return reply.code(500).send({ ok: false, error: 'Could not create employee' });
        }
        return reply.status(201).send({
            ok: true,
            employee: {
                id: data.id,
                email: data.email,
                fullName: data.full_name,
                role: data.role,
                active: data.active,
                lastLoginAt: data.last_login_at,
                createdAt: data.created_at,
            },
        });
    });
    app.patch(`${api}/staff/:id`, async (request, reply) => {
        const actor = assertStaffManagement(request);
        const { id } = request.params;
        const body = z
            .object({
            fullName: z.string().min(2).max(120).optional(),
            role: z.enum(CONSOLE_ROLES).optional(),
            active: z.boolean().optional(),
        })
            .parse(request.body);
        if (body.role !== undefined)
            assertCanAssignRole(request, body.role);
        const patch = { updated_at: new Date().toISOString() };
        if (body.fullName !== undefined)
            patch.full_name = body.fullName.trim();
        if (body.role !== undefined)
            patch.role = body.role;
        if (body.active !== undefined)
            patch.active = body.active;
        if (body.active === false)
            await assertCanDeactivateSuperAdmin(id);
        const { data, error } = await supabase
            .from('admin_users')
            .update(patch)
            .eq('id', id)
            .select('id, email, full_name, role, active, last_login_at, created_at')
            .single();
        throwIfSupabaseError(error, 'Could not update employee');
        if (!data)
            return reply.code(404).send({ ok: false, error: 'Employee not found' });
        await logAdminMutation({
            actorId: actor.id,
            actorEmail: actor.email,
            action: 'update',
            resource: 'admin_users',
            resourceId: id,
            details: body,
        });
        return reply.send({
            ok: true,
            employee: {
                id: data.id,
                email: data.email,
                fullName: data.full_name,
                role: data.role,
                active: data.active,
                lastLoginAt: data.last_login_at,
                createdAt: data.created_at,
            },
        });
    });
    app.delete(`${api}/staff/:id`, async (request, reply) => {
        requireAdminRole(request, 'super_admin', 'admin');
        const actor = requireAdmin(request);
        const { id } = request.params;
        if (actor.id === id) {
            return reply.code(400).send({ ok: false, error: 'You cannot deactivate your own account' });
        }
        await assertCanDeactivateSuperAdmin(id);
        const { error } = await supabase
            .from('admin_users')
            .update({ active: false, updated_at: new Date().toISOString() })
            .eq('id', id);
        throwIfSupabaseError(error, 'Could not deactivate employee');
        await logAdminMutation({
            actorId: actor.id,
            actorEmail: actor.email,
            action: 'archive',
            resource: 'admin_users',
            resourceId: id,
        });
        return reply.send({ ok: true });
    });
    app.get(`${api}/staff/workspace`, async (request, reply) => {
        requireAdmin(request);
        const { staffAdminService } = await import('../../services/admin/staff-admin.service.js');
        const workspace = await staffAdminService.getWorkspace();
        return reply.send({ ok: true, ...workspace });
    });
    app.get(`${api}/staff/:id`, async (request, reply) => {
        requireAdmin(request);
        const { staffAdminService } = await import('../../services/admin/staff-admin.service.js');
        const { AppError } = await import('../../lib/errors.js');
        const { id } = request.params;
        if (id === 'workspace') {
            const workspace = await staffAdminService.getWorkspace();
            return reply.send({ ok: true, ...workspace });
        }
        const detail = await staffAdminService.getEmployeeDetail(id);
        if (!detail) {
            throw new AppError('Employee not found', 404, 'NOT_FOUND');
        }
        return reply.send({ ok: true, ...detail });
    });
    app.get(`${api}/employees`, async (request, reply) => {
        requireAdminRole(request, 'super_admin', 'admin', 'manager');
        const q = request.query;
        const rows = await employeeProfileService.list({
            role: q.role,
            status: q.status,
            search: q.search,
            limit: q.limit ? Number(q.limit) : 80,
        });
        return reply.send({ ok: true, employees: rows });
    });
    app.get(`${api}/employees/:id`, async (request, reply) => {
        requireAdminRole(request, 'super_admin', 'admin', 'manager');
        const { id } = request.params;
        const employee = await employeeProfileService.getById(id);
        return reply.send({ ok: true, employee });
    });
    app.post(`${api}/employees`, async (request, reply) => {
        assertStaffManagement(request);
        const body = z
            .object({
            fullName: z.string().min(2).max(120),
            email: z.string().email().max(255),
            role: z.enum(CONSOLE_ROLES),
            status: z.enum(['active', 'inactive']).optional(),
            personalMobile: z.string().max(20).optional(),
            companyWhatsapp: z.string().max(20).optional(),
            alternateMobile: z.string().max(20).optional(),
            gender: z.string().max(30).optional(),
            dateOfBirth: z.string().optional(),
            joiningDate: z.string().optional(),
            department: z.string().max(100).optional(),
            reportingManagerId: z.string().uuid().nullable().optional(),
            employmentType: z.string().max(50).optional(),
            state: z.string().max(100).optional(),
            district: z.string().max(100).optional(),
            taluk: z.string().max(100).optional(),
            pincodeId: z.string().uuid().nullable().optional(),
            address: z.string().max(1000).optional(),
            languages: z.array(z.string()).optional(),
            cropsExpertise: z.array(z.string()).optional(),
            diseaseKnowledgeRating: z.number().int().min(0).max(100).optional(),
            whatsappSkillRating: z.number().int().min(0).max(100).optional(),
            customerHandlingRating: z.number().int().min(0).max(100).optional(),
            fieldExperienceYears: z.number().min(0).max(50).optional(),
            compensation: z.record(z.any()).optional(),
            attendanceRules: z.record(z.any()).optional(),
        })
            .parse(request.body);
        assertCanAssignRole(request, body.role);
        const employee = await employeeProfileService.create(body);
        await staffInviteService.ensurePendingAdminUser(String(employee.id));
        return reply.status(201).send({ ok: true, employee });
    });
    app.patch(`${api}/employees/:id`, async (request, reply) => {
        requireAdminRole(request, 'super_admin', 'admin');
        const { id } = request.params;
        const body = z
            .object({
            fullName: z.string().min(2).max(120).optional(),
            email: z.string().email().max(255).optional(),
            role: z.string().min(2).max(50).optional(),
            status: z.enum(['active', 'inactive']).optional(),
            personalMobile: z.string().max(20).optional(),
            companyWhatsapp: z.string().max(20).optional(),
            alternateMobile: z.string().max(20).optional(),
            gender: z.string().max(30).optional(),
            dateOfBirth: z.string().optional(),
            joiningDate: z.string().optional(),
            department: z.string().max(100).optional(),
            reportingManagerId: z.string().uuid().nullable().optional(),
            employmentType: z.string().max(50).optional(),
            state: z.string().max(100).optional(),
            district: z.string().max(100).optional(),
            taluk: z.string().max(100).optional(),
            pincodeId: z.string().uuid().nullable().optional(),
            address: z.string().max(1000).optional(),
            languages: z.array(z.string()).optional(),
            cropsExpertise: z.array(z.string()).optional(),
            diseaseKnowledgeRating: z.number().int().min(0).max(100).optional(),
            whatsappSkillRating: z.number().int().min(0).max(100).optional(),
            customerHandlingRating: z.number().int().min(0).max(100).optional(),
            fieldExperienceYears: z.number().min(0).max(50).optional(),
            compensation: z.record(z.any()).optional(),
            attendanceRules: z.record(z.any()).optional(),
        })
            .parse(request.body);
        const employee = await employeeProfileService.update(id, body);
        return reply.send({ ok: true, employee });
    });
    app.post(`${api}/employees/:id/send-setup-link`, async (request, reply) => {
        const actor = requireAdmin(request);
        assertStaffManagement(request);
        const { id } = request.params;
        const invite = await staffInviteService.createInvite({
            employeeProfileId: id,
            createdBy: actor.id,
        });
        return reply.send({ ok: true, invite });
    });
    app.post(`${api}/employees/:id/reset-password-link`, async (request, reply) => {
        const actor = requireAdmin(request);
        requireAdminRole(request, 'super_admin', 'admin', 'manager');
        const { id } = request.params;
        const body = z
            .object({
            channels: z.array(z.enum(['personal_mobile', 'company_whatsapp', 'email'])).min(1),
        })
            .parse(request.body ?? {});
        const token = await employeeAccessService.createSetupToken({
            employeeProfileId: id,
            purpose: 'reset_password',
            createdBy: actor.id,
            channels: body.channels,
        });
        return reply.send({ ok: true, reset: token });
    });
    app.post(`${api}/employees/:id/deactivate`, async (request, reply) => {
        const actor = requireAdmin(request);
        requireAdminRole(request, 'super_admin', 'admin');
        const { id } = request.params;
        const body = z.object({ confirmPassword: z.string().min(8).max(128) }).parse(request.body ?? {});
        const { data: actorRow, error: actorErr } = await supabase
            .from('admin_users')
            .select('password_hash')
            .eq('id', actor.id)
            .eq('active', true)
            .maybeSingle();
        throwIfSupabaseError(actorErr, 'Could not verify admin credentials');
        if (!actorRow?.password_hash || !verifyPassword(body.confirmPassword, actorRow.password_hash)) {
            return reply.code(401).send({ ok: false, error: 'Password confirmation failed' });
        }
        const runId = await employeeReassignmentService.runForDeactivation(id);
        const employee = await employeeProfileService.update(id, { status: 'inactive' });
        return reply.send({ ok: true, runId, employee });
    });
    app.post(`${api}/employees/:id/attendance/recompute`, async (request, reply) => {
        requireAdminRole(request, 'super_admin', 'admin', 'manager');
        const { id } = request.params;
        const body = z.object({ date: z.string() }).parse(request.body);
        const daily = await attendanceCalculatorService.recomputeDaily(id, body.date);
        return reply.send({ ok: true, daily });
    });
    app.get(`${api}/employees/:id/attendance/monthly`, async (request, reply) => {
        requireAdminRole(request, 'super_admin', 'admin', 'manager');
        const { id } = request.params;
        const q = request.query;
        const now = new Date();
        const year = q.year ? Number(q.year) : now.getUTCFullYear();
        const month = q.month ? Number(q.month) : now.getUTCMonth() + 1;
        const summary = await attendanceCalculatorService.summarizeMonth(id, year, month);
        return reply.send({ ok: true, summary });
    });
    app.post(`${api}/employees/:id/incentives/preview`, async (request, reply) => {
        requireAdminRole(request, 'super_admin', 'admin', 'manager');
        const { id } = request.params;
        const body = z
            .object({
            monthlySalesInr: z.number().min(0),
            conversionRatePct: z.number().min(0).max(100),
        })
            .parse(request.body);
        const preview = await incentiveCalculatorService.estimateMonthlyIncentive(id, body.monthlySalesInr, body.conversionRatePct);
        return reply.send({ ok: true, preview });
    });
    app.post(`${api}/payroll/cycles/generate`, async (request, reply) => {
        requireAdminRole(request, 'super_admin', 'admin');
        const actor = requireAdmin(request);
        const body = z.object({ year: z.number().int(), month: z.number().int().min(1).max(12) }).parse(request.body);
        const cycle = await payrollGeneratorService.generateCycle(body.year, body.month, actor.id);
        return reply.send({ ok: true, cycle });
    });
    app.post(`${api}/payroll/entries/:id/publish`, async (request, reply) => {
        requireAdminRole(request, 'super_admin', 'admin', 'manager');
        const actor = requireAdmin(request);
        const { id } = request.params;
        const pdf = await payrollGeneratorService.publishPayrollEntry(id, actor.id);
        return reply.send({ ok: true, pdf });
    });
    app.post(`${api}/payroll/entries/:id/deliver`, async (request, reply) => {
        requireAdminRole(request, 'super_admin', 'admin', 'manager');
        const { id } = request.params;
        const body = z
            .object({
            channels: z.array(z.enum(['whatsapp', 'email', 'dashboard'])).min(1),
        })
            .parse(request.body);
        await payrollGeneratorService.deliverPayout(id, body.channels);
        return reply.send({ ok: true });
    });
    app.get(`${api}/farmers`, async (request, reply) => {
        requireAdmin(request);
        const q = request.query;
        const status = q.status === 'active' || q.status === 'inactive' ? q.status : 'all';
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
        const { id } = request.params;
        const { farmer } = await farmersAdminService.get(id);
        return reply.send({ ok: true, farmer });
    });
    app.patch(`${api}/farmers/:id`, async (request, reply) => {
        requireAdminRole(request, 'admin', 'manager');
        const { id } = request.params;
        const body = farmerUpdateSchema.parse(request.body);
        const farmer = await farmersAdminService.update(id, body);
        return reply.send({ ok: true, farmer });
    });
    app.delete(`${api}/farmers/:id`, async (request, reply) => {
        requireAdminRole(request, 'super_admin', 'admin', 'manager');
        const actor = requireAdmin(request);
        const { id } = request.params;
        const { error } = await supabase
            .from('farmers')
            .update({ source: 'archived', updated_at: new Date().toISOString() })
            .eq('id', id);
        throwIfSupabaseError(error, 'Could not archive farmer');
        await logAdminMutation({
            actorId: actor.id,
            actorEmail: actor.email,
            action: 'archive',
            resource: 'farmers',
            resourceId: id,
        });
        return reply.send({ ok: true });
    });
    app.get(`${api}/telecaller/overview`, async (request, reply) => {
        const admin = requireAdmin(request);
        const overview = await telecallerAdminService.getOverview(admin.email);
        const { count } = await supabase.from('leads').select('id', { count: 'exact', head: true });
        overview.allLeadsCount = count ?? 0;
        return reply.send({ ok: true, overview });
    });
    app.get(`${api}/telecaller/leads`, async (request, reply) => {
        const admin = requireAdmin(request);
        const q = request.query;
        const result = await telecallerAdminService.listLeads({
            scope: q.scope === 'mine' ? 'mine' : 'all',
            stage: q.stage,
            search: q.search,
            page: q.page ? Number(q.page) : 1,
            limit: q.limit ? Number(q.limit) : 20,
        }, admin.email);
        return reply.send({ ok: true, ...result });
    });
    app.get(`${api}/telecaller/leads/:id`, async (request, reply) => {
        requireAdmin(request);
        const { id } = request.params;
        const detail = await telecallerAdminService.getLeadDetail(id);
        return reply.send({ ok: true, ...detail });
    });
    app.post(`${api}/telecaller/leads`, async (request, reply) => {
        requireAdminRole(request, 'admin', 'manager');
        const admin = requireAdmin(request);
        const body = z
            .object({
            phone: z.string().min(10),
            name: z.string().optional(),
            notes: z.string().optional(),
            cropType: z.string().optional(),
            district: z.string().optional(),
            state: z.string().optional(),
        })
            .parse(request.body);
        const detail = await telecallerAdminService.createLead(body, admin.email);
        return reply.status(201).send({ ok: true, ...detail });
    });
    app.patch(`${api}/telecaller/leads/:id`, async (request, reply) => {
        requireAdminRole(request, 'admin', 'manager');
        const admin = requireAdmin(request);
        const { id } = request.params;
        const body = z
            .object({
            stage: z
                .enum([
                'new_lead',
                'interested',
                'follow_up',
                'recommendation',
                'order_placed',
                'repeat_customer',
            ])
                .optional(),
            notes: z.string().optional(),
            followUpAt: z.string().nullable().optional(),
            assignedTo: z.string().nullable().optional(),
            priority: z.string().optional(),
        })
            .parse(request.body);
        const detail = await telecallerAdminService.updateLead(id, body, admin.email);
        return reply.send({ ok: true, ...detail });
    });
    app.post(`${api}/telecaller/leads/:id/notes`, async (request, reply) => {
        requireAdminRole(request, 'admin', 'manager');
        const admin = requireAdmin(request);
        const { id } = request.params;
        const { note } = z.object({ note: z.string().min(1) }).parse(request.body);
        const detail = await telecallerAdminService.addNote(id, note, admin.email);
        return reply.send({ ok: true, ...detail });
    });
    app.post(`${api}/telecaller/leads/:id/calls`, async (request, reply) => {
        requireAdminRole(request, 'admin', 'manager');
        const admin = requireAdmin(request);
        const { id } = request.params;
        const body = z
            .object({
            outcome: z.string().optional(),
            notes: z.string().optional(),
            durationSeconds: z.number().int().optional(),
        })
            .parse(request.body);
        const detail = await telecallerAdminService.logCall(id, body, admin.email);
        return reply.send({ ok: true, ...detail });
    });
    app.post(`${api}/telecaller/leads/:id/tasks`, async (request, reply) => {
        requireAdminRole(request, 'admin', 'manager');
        const admin = requireAdmin(request);
        const { id } = request.params;
        const body = z
            .object({
            title: z.string().min(1),
            dueAt: z.string().optional(),
            notes: z.string().optional(),
            taskType: z.string().optional(),
        })
            .parse(request.body);
        const task = await telecallerAdminService.createTask(id, body, admin.email);
        return reply.send({ ok: true, task });
    });
    app.patch(`${api}/telecaller/tasks/:id/complete`, async (request, reply) => {
        requireAdminRole(request, 'admin', 'manager');
        const { id } = request.params;
        await telecallerAdminService.completeTask(id);
        return reply.send({ ok: true });
    });
    app.get(`${api}/telecaller/tasks`, async (request, reply) => {
        const admin = requireAdmin(request);
        const q = request.query;
        const tasks = await telecallerAdminService.listTasks(admin.email, q.status ?? 'pending');
        return reply.send({ ok: true, tasks });
    });
    app.get(`${api}/telecaller/calls`, async (request, reply) => {
        const admin = requireAdmin(request);
        const calls = await telecallerAdminService.listCalls(admin.email);
        return reply.send({ ok: true, calls });
    });
    app.get(`${api}/telecaller/whatsapp`, async (request, reply) => {
        requireAdmin(request);
        const threads = await telecallerAdminService.listWhatsAppThreads();
        return reply.send({ ok: true, threads });
    });
    app.get(`${api}/telecaller/whatsapp/:farmerId/messages`, async (request, reply) => {
        requireAdmin(request);
        const { farmerId } = request.params;
        const messages = await telecallerAdminService.getWhatsAppMessages(farmerId);
        return reply.send({ ok: true, messages });
    });
    app.post(`${api}/telecaller/whatsapp/:farmerId/send`, async (request, reply) => {
        requireAdminRole(request, 'admin', 'manager');
        const admin = requireAdmin(request);
        const { farmerId } = request.params;
        const { text } = z.object({ text: z.string().min(1).max(4096) }).parse(request.body);
        const result = await telecallerAdminService.sendWhatsAppMessage(farmerId, text, admin.email);
        return reply.send({ ok: true, ...result });
    });
    // ─── WhatsApp OS controls (pause AI, set owner, set language) ─────────
    app.get(`${api}/whatsapp/:farmerId/session`, async (request, reply) => {
        requireAdmin(request);
        const { farmerId } = request.params;
        const session = await whatsappOsAdminService.getConversationSession(farmerId);
        return reply.send({ ok: true, session });
    });
    app.patch(`${api}/whatsapp/:farmerId/session`, async (request, reply) => {
        requireAdminRole(request, 'admin', 'manager');
        const { farmerId } = request.params;
        const body = z
            .object({
            aiPaused: z.boolean().optional(),
            owner: z.enum(['ai', 'telecaller', 'agronomist']).optional(),
            preferredLanguage: z.enum(['en', 'ml', 'ta', 'kn', 'hi']).nullable().optional(),
            activePlotId: z.string().uuid().nullable().optional(),
            activeBlockId: z.string().uuid().nullable().optional(),
        })
            .parse(request.body);
        const session = await whatsappOsAdminService.updateConversationSession(farmerId, body);
        return reply.send({ ok: true, session });
    });
    app.get(`${api}/whatsapp/crop-prices`, async (request, reply) => {
        requireAdmin(request);
        const q = request.query;
        const prices = await whatsappOsAdminService.listCropDailyPrices(q.crop);
        return reply.send({ ok: true, prices });
    });
    app.post(`${api}/whatsapp/crop-prices`, async (request, reply) => {
        requireAdminRole(request, 'admin', 'manager');
        const body = z
            .object({
            cropType: z.string().min(1),
            marketName: z.string().min(1),
            district: z.string().optional(),
            pricePerKg: z.number().positive(),
            lastYearPricePerKg: z.number().positive().optional(),
            priceDate: z.string().optional(),
        })
            .parse(request.body);
        const row = await whatsappOsAdminService.upsertCropDailyPrice(body);
        return reply.send({ ok: true, price: row });
    });
    app.get(`${api}/whatsapp/broadcasts/rules`, async (request, reply) => {
        requireAdmin(request);
        const rules = await whatsappBroadcastAdminService.listRules();
        return reply.send({ ok: true, rules });
    });
    app.get(`${api}/whatsapp/broadcasts/deliveries`, async (request, reply) => {
        requireAdmin(request);
        const q = request.query;
        const deliveries = await whatsappBroadcastAdminService.listDeliveries({
            farmerId: q.farmerId,
            limit: q.limit ? Number(q.limit) : 50,
        });
        return reply.send({ ok: true, deliveries });
    });
    app.post(`${api}/whatsapp/broadcasts/run`, async (request, reply) => {
        requireAdminRole(request, 'admin', 'manager');
        const body = z
            .object({
            farmerId: z.string().uuid().optional(),
            dryRun: z.boolean().optional(),
            kinds: z
                .array(z.enum([
                'cultivation_schedule',
                'fertigation_reminder',
                'pgr_broadcast',
                'dap_task',
                'cultivation_knowledge',
            ]))
                .optional(),
        })
            .parse(request.body ?? {});
        const result = await whatsappBroadcastAdminService.runBroadcasts(body);
        return reply.send({ ok: true, result });
    });
    app.post(`${api}/whatsapp/broadcasts/rules`, async (request, reply) => {
        requireAdminRole(request, 'admin', 'manager');
        const body = z
            .object({
            id: z.string().uuid().optional(),
            cropType: z.string().min(1),
            broadcastKind: z.enum([
                'cultivation_schedule',
                'fertigation_reminder',
                'pgr_broadcast',
                'dap_task',
                'cultivation_knowledge',
            ]),
            targetDap: z.number().int().nullable().optional(),
            dapTolerance: z.number().int().optional(),
            minDap: z.number().int().nullable().optional(),
            maxDap: z.number().int().nullable().optional(),
            weekday: z.number().int().min(1).max(7).nullable().optional(),
            priority: z.number().int().optional(),
            active: z.boolean().optional(),
        })
            .parse(request.body);
        const rule = await whatsappBroadcastAdminService.upsertRule(body);
        return reply.send({ ok: true, rule });
    });
    app.get(`${api}/terminology/tasks`, async (request, reply) => {
        requireAdmin(request);
        const q = request.query;
        const tasks = await whatsappOsAdminService.listTerminologyReviewTasks(q.status ?? 'open');
        return reply.send({ ok: true, tasks });
    });
    app.get(`${api}/search`, async (request, reply) => {
        requireAdmin(request);
        const q = request.query;
        const results = await consoleSearchService.search(q?.q ?? '');
        return reply.send({ ok: true, results });
    });
    app.get(`${api}/telecaller/nav-badges`, async (request, reply) => {
        requireAdmin(request);
        const badges = await telecallerAdminService.getNavBadges();
        return reply.send({ ok: true, badges });
    });
    app.get(`${api}/telecaller/leads/:id/field-findings`, async (request, reply) => {
        requireAdmin(request);
        const { id } = request.params;
        const q = request.query;
        const detail = await telecallerAdminService.getLeadDetail(id);
        const result = await telecallerAdminService.listFieldFindings(detail.lead.farmerId, q.page ? Number(q.page) : 1, q.limit ? Number(q.limit) : 10);
        return reply.send({ ok: true, ...result });
    });
    app.post(`${api}/telecaller/leads/:id/field-findings`, async (request, reply) => {
        requireAdminRole(request, 'admin', 'manager');
        const { id } = request.params;
        const body = z
            .object({
            blockId: z.string().uuid().optional(),
            blockName: z.string().min(1),
            cropType: z.string().min(1),
            observations: z.string().optional(),
            diseasePest: z.string().optional(),
            diseaseTone: z.enum(['healthy', 'warning', 'danger']).optional(),
            actionTaken: z.string().optional(),
        })
            .parse(request.body);
        const detail = await telecallerAdminService.getLeadDetail(id);
        const finding = await telecallerAdminService.createFieldFinding(detail.lead.farmerId, id, body);
        return reply.status(201).send({ ok: true, finding });
    });
    app.get(`${api}/crm/farmers/:farmerId/internal-notes`, async (request, reply) => {
        requireAdmin(request);
        const { farmerId } = request.params;
        const q = request.query;
        const notes = await crmInternalNotesService.list(farmerId, q.includeArchived === 'true');
        return reply.send({ ok: true, notes });
    });
    app.post(`${api}/crm/farmers/:farmerId/internal-notes`, async (request, reply) => {
        const admin = requireAdmin(request);
        const { farmerId } = request.params;
        const body = z
            .object({
            body: z.string().min(1).max(4000),
            category: z
                .enum([
                'general',
                'preference',
                'acreage',
                'disease_pattern',
                'callback',
                'commerce',
            ])
                .optional(),
            pinned: z.boolean().optional(),
        })
            .parse(request.body);
        const note = await crmInternalNotesService.create(farmerId, {
            ...body,
            author: admin.email,
        });
        return reply.status(201).send({ ok: true, note });
    });
    app.patch(`${api}/crm/internal-notes/:noteId`, async (request, reply) => {
        requireAdmin(request);
        const { noteId } = request.params;
        const body = z
            .object({
            body: z.string().min(1).max(4000).optional(),
            category: z
                .enum([
                'general',
                'preference',
                'acreage',
                'disease_pattern',
                'callback',
                'commerce',
            ])
                .optional(),
            pinned: z.boolean().optional(),
        })
            .parse(request.body);
        const note = await crmInternalNotesService.update(noteId, body);
        return reply.send({ ok: true, note });
    });
    app.delete(`${api}/crm/internal-notes/:noteId`, async (request, reply) => {
        requireAdmin(request);
        const { noteId } = request.params;
        const note = await crmInternalNotesService.archive(noteId);
        return reply.send({ ok: true, note });
    });
    app.get(`${api}/crm/masters`, async (request, reply) => {
        requireAdmin(request);
        const q = request.query;
        const type = z.string().min(1).parse(q.type ?? 'crop');
        const items = await crmFarmerService.listMasters(type, q.parentId || null, q.search);
        return reply.send({ ok: true, items });
    });
    app.post(`${api}/crm/masters`, async (request, reply) => {
        requireAdminRole(request, 'admin', 'manager');
        const body = z
            .object({
            masterType: z.string().min(1),
            name: z.string().min(1).max(120),
            parentId: z.string().uuid().nullable().optional(),
            category: z.string().optional(),
            description: z.string().optional(),
        })
            .parse(request.body);
        const item = await crmFarmerService.createMaster({
            masterType: body.masterType,
            name: body.name,
            parentId: body.parentId,
            category: body.category,
            description: body.description,
        });
        return reply.status(201).send({ ok: true, item });
    });
    app.patch(`${api}/crm/masters/:id`, async (request, reply) => {
        requireAdminRole(request, 'admin', 'manager');
        const { id } = request.params;
        const body = z
            .object({
            name: z.string().min(1).optional(),
            active: z.boolean().optional(),
            description: z.string().optional(),
        })
            .parse(request.body);
        const item = await crmFarmerService.updateMaster(id, body);
        return reply.send({ ok: true, item });
    });
    app.get(`${api}/telecaller/leads/:id/crm`, async (request, reply) => {
        requireAdmin(request);
        const { id } = request.params;
        const admin = requireAdmin(request);
        const detail = await telecallerAdminService.getLeadDetail(id);
        const farmerId = detail.lead.farmerId;
        const bundle = await crmFarmerService.getFarmerCrmBundle(farmerId, id, admin.email);
        return reply.send({ ok: true, ...bundle });
    });
    app.get(`${api}/telecaller/leads/:id/blocks`, async (request, reply) => {
        requireAdmin(request);
        const { id } = request.params;
        const detail = await telecallerAdminService.getLeadDetail(id);
        const blocks = await crmFarmerService.ensureDemoBlocks(detail.lead.farmerId);
        return reply.send({ ok: true, blocks });
    });
    app.post(`${api}/telecaller/leads/:id/blocks`, async (request, reply) => {
        requireAdminRole(request, 'admin', 'manager');
        const { id } = request.params;
        const body = z
            .object({
            name: z.string().min(1),
            area: z.string().optional(),
            cropId: z.string().uuid().optional(),
            cropName: z.string().optional(),
            varietyId: z.string().uuid().optional(),
            varietyName: z.string().optional(),
            irrigationTypeId: z.string().uuid().optional(),
            soilTypeId: z.string().uuid().optional(),
            plantingDate: z.string().optional(),
            spacing: z.string().optional(),
        })
            .parse(request.body);
        const detail = await telecallerAdminService.getLeadDetail(id);
        const block = await crmFarmerService.createBlock(detail.lead.farmerId, body);
        return reply.status(201).send({ ok: true, block });
    });
    app.get(`${api}/telecaller/leads/:leadId/blocks/:blockId/workspace`, async (request, reply) => {
        requireAdmin(request);
        const { leadId, blockId } = request.params;
        const detail = await telecallerAdminService.getLeadDetail(leadId);
        const workspace = await crmFarmerService.getBlockWorkspace(detail.lead.farmerId, blockId);
        return reply.send({ ok: true, ...workspace });
    });
    app.get(`${api}/telecaller/leads/:id/interactions`, async (request, reply) => {
        requireAdmin(request);
        const { id } = request.params;
        const q = request.query;
        const detail = await telecallerAdminService.getLeadDetail(id);
        const page = q.page ? Number(q.page) : 1;
        const limit = q.limit ? Number(q.limit) : 10;
        const result = q.type || q.status || q.blockId
            ? await crmFarmerService.listInteractionsFiltered(detail.lead.farmerId, { type: q.type, status: q.status, blockId: q.blockId }, page, limit)
            : await crmFarmerService.listInteractions(detail.lead.farmerId, page, limit);
        return reply.send({ ok: true, ...result });
    });
    app.post(`${api}/telecaller/leads/:id/interactions`, async (request, reply) => {
        requireAdminRole(request, 'admin', 'manager');
        const admin = requireAdmin(request);
        const { id } = request.params;
        const body = z
            .object({
            interactionType: z.string().min(1),
            blockId: z.string().uuid().optional(),
            summary: z.string().optional(),
            notes: z.string().optional(),
            nextAction: z.string().optional(),
            nextActionAt: z.string().optional(),
            status: z.string().optional(),
        })
            .parse(request.body);
        const detail = await telecallerAdminService.getLeadDetail(id);
        const interaction = await crmFarmerService.createInteraction(detail.lead.farmerId, id, {
            ...body,
            doneBy: admin.email,
            doneByRole: 'Telecaller',
        });
        return reply.status(201).send({ ok: true, interaction });
    });
    app.get(`${api}/telecaller/leads/:id/recommendations`, async (request, reply) => {
        requireAdmin(request);
        const { id } = request.params;
        const q = request.query;
        const detail = await telecallerAdminService.getLeadDetail(id);
        const result = await crmFarmerService.listRecommendations(detail.lead.farmerId, q.page ? Number(q.page) : 1, q.limit ? Number(q.limit) : 10);
        return reply.send({ ok: true, ...result });
    });
    app.post(`${api}/telecaller/leads/:id/recommendations`, async (request, reply) => {
        requireAdminRole(request, 'admin', 'manager');
        const admin = requireAdmin(request);
        const { id } = request.params;
        const body = z
            .object({
            blockId: z.string().uuid().optional(),
            recType: z.enum(['ai', 'agronomist', 'spray', 'drench']).optional(),
            problem: z.string().optional(),
            recommendation: z.string().min(1),
            dosage: z.string().optional(),
            applicationMethod: z.string().optional(),
            followUpAt: z.string().optional(),
        })
            .parse(request.body);
        const detail = await telecallerAdminService.getLeadDetail(id);
        const rec = await crmFarmerService.createRecommendation(detail.lead.farmerId, id, {
            ...body,
            recommendedBy: admin.email,
        });
        return reply.status(201).send({ ok: true, recommendation: rec });
    });
    app.post(`${api}/telecaller/leads/:id/soil-reports`, async (request, reply) => {
        requireAdminRole(request, 'admin', 'manager');
        const admin = requireAdmin(request);
        const { id } = request.params;
        const body = z
            .object({
            blockId: z.string().uuid().optional(),
            metrics: z.record(z.unknown()).optional(),
            pdfUrl: z.string().optional(),
        })
            .parse(request.body);
        const detail = await telecallerAdminService.getLeadDetail(id);
        const report = await crmFarmerService.createSoilReport(detail.lead.farmerId, {
            ...body,
            uploadedBy: admin.email,
        });
        return reply.status(201).send({ ok: true, report });
    });
    app.patch(`${api}/telecaller/leads/:leadId/blocks/:blockId`, async (request, reply) => {
        requireAdminRole(request, 'admin', 'manager', 'telecaller');
        const { blockId } = request.params;
        const body = request.body;
        const block = await crmFarmerService.updateBlock(blockId, body);
        return reply.send({ ok: true, block });
    });
    app.patch(`${api}/telecaller/interactions/:id`, async (request, reply) => {
        requireAdminRole(request, 'admin', 'manager', 'telecaller');
        const { id } = request.params;
        const body = z
            .object({
            interactionType: z.string().optional(),
            summary: z.string().optional(),
            status: z.string().optional(),
            nextActionAt: z.string().optional(),
        })
            .parse(request.body);
        const interaction = await crmFarmerService.updateInteraction(id, {
            interaction_type: body.interactionType,
            summary: body.summary,
            status: body.status,
            next_action_at: body.nextActionAt,
        });
        return reply.send({ ok: true, interaction });
    });
    app.post(`${api}/telecaller/interactions/:id/archive`, async (request, reply) => {
        requireAdminRole(request, 'admin', 'manager', 'telecaller');
        const { id } = request.params;
        await crmFarmerService.archiveInteraction(id);
        return reply.send({ ok: true });
    });
    app.patch(`${api}/telecaller/recommendations/:id`, async (request, reply) => {
        requireAdminRole(request, 'admin', 'manager', 'telecaller');
        const { id } = request.params;
        const body = z
            .object({
            problem: z.string().optional(),
            recommendation: z.string().optional(),
            dosage: z.string().optional(),
            status: z.string().optional(),
        })
            .parse(request.body);
        const rec = await crmFarmerService.updateRecommendation(id, body);
        return reply.send({ ok: true, recommendation: rec });
    });
    app.post(`${api}/telecaller/recommendations/:id/archive`, async (request, reply) => {
        requireAdminRole(request, 'admin', 'manager', 'telecaller');
        const { id } = request.params;
        await crmFarmerService.archiveRecommendation(id);
        return reply.send({ ok: true });
    });
    app.post(`${api}/telecaller/leads/:id/recommendations/:recId/convert-order`, async (request, reply) => {
        requireAdminRole(request, 'admin', 'manager', 'telecaller');
        const admin = requireAdmin(request);
        const { id, recId } = request.params;
        const detail = await telecallerAdminService.getLeadDetail(id);
        const order = await crmFarmerService.convertRecommendationToOrder(recId, detail.lead.farmerId, id, admin.email);
        return reply.status(201).send({ ok: true, order });
    });
    app.post(`${api}/telecaller/leads/:id/orders`, async (request, reply) => {
        requireAdminRole(request, 'admin', 'manager', 'telecaller');
        const admin = requireAdmin(request);
        const { id } = request.params;
        const body = z
            .object({
            blockId: z.string().uuid().optional(),
            lineItems: z.array(z.object({
                variantId: z.number().optional(),
                title: z.string(),
                quantity: z.number().min(1),
                price: z.number().min(0),
            })),
            paymentMode: z.string().optional(),
            deliveryAddress: z.string().optional(),
            notes: z.string().optional(),
        })
            .parse(request.body);
        const detail = await telecallerAdminService.getLeadDetail(id);
        const order = await crmFarmerService.createManualOrder(detail.lead.farmerId, id, {
            ...body,
            createdBy: admin.email,
        });
        return reply.status(201).send({ ok: true, order });
    });
    app.get(`${api}/telecaller/orders/catalog`, async (request, reply) => {
        requireAdmin(request);
        const q = request.query;
        const items = await crmFarmerService.getOrderCatalog(q.search);
        return reply.send({ ok: true, items });
    });
    app.post(`${api}/telecaller/leads/:id/schedule-visit`, async (request, reply) => {
        requireAdminRole(request, 'admin', 'manager', 'telecaller');
        const admin = requireAdmin(request);
        const { id } = request.params;
        const body = z
            .object({
            title: z.string().optional(),
            dueAt: z.string(),
            notes: z.string().optional(),
            blockId: z.string().uuid().optional(),
        })
            .parse(request.body);
        const detail = await telecallerAdminService.getLeadDetail(id);
        const result = await crmFarmerService.scheduleVisit(detail.lead.farmerId, id, { ...body, assignedTo: admin.email });
        return reply.status(201).send({ ok: true, ...result });
    });
    app.get(`${api}/telecaller/leads/:id/export`, async (request, reply) => {
        requireAdmin(request);
        const { id } = request.params;
        const q = request.query;
        const type = (q.type ?? 'lead');
        const detail = await telecallerAdminService.getLeadDetail(id);
        const farmerId = detail.lead.farmerId;
        let html = '';
        if (type === 'lead') {
            html = crmFarmerService.buildExportHtml('lead', {
                title: `Farmer — ${detail.lead.farmerName}`,
                rows: [
                    { label: 'Name', value: String(detail.lead.farmerName) },
                    { label: 'Phone', value: String(detail.lead.phone ?? '') },
                    { label: 'Stage', value: String(detail.lead.stageLabel ?? detail.lead.stage) },
                    { label: 'District', value: String(detail.lead.district ?? '') },
                ],
            });
        }
        else if (type === 'recommendations') {
            const recs = await crmFarmerService.listRecommendations(farmerId, 1, 50);
            html = crmFarmerService.buildExportHtml('recommendations', {
                title: `Recommendations — ${detail.lead.farmerName}`,
                table: {
                    cols: ['Date', 'Block', 'Problem', 'Recommendation', 'Status'],
                    rows: recs.recommendations.map((r) => [
                        r.dateLabel ?? '',
                        r.blockName ?? '',
                        r.problem ?? '',
                        r.recommendation ?? '',
                        r.status ?? '',
                    ]),
                },
            });
        }
        else if (type === 'interactions') {
            const ix = await crmFarmerService.listInteractions(farmerId, 1, 50);
            html = crmFarmerService.buildExportHtml('interactions', {
                title: `Interactions — ${detail.lead.farmerName}`,
                table: {
                    cols: ['Date', 'Type', 'By', 'Summary', 'Status'],
                    rows: ix.interactions.map((i) => [
                        i.atLabel ?? '',
                        i.typeLabel ?? '',
                        i.by ?? '',
                        String(i.summary ?? '').slice(0, 80),
                        i.status ?? '',
                    ]),
                },
            });
        }
        else {
            const ff = await telecallerAdminService.listFieldFindings(farmerId, 1, 50);
            html = crmFarmerService.buildExportHtml('findings', {
                title: `Field Findings — ${detail.lead.farmerName}`,
                table: {
                    cols: ['Date', 'Block', 'Agronomist', 'Observations', 'Disease'],
                    rows: ff.findings.map((f) => [
                        f.visitedLabel ?? '',
                        f.blockName ?? '',
                        f.agronomistName ?? '',
                        String(f.observations ?? '').slice(0, 80),
                        f.diseasePest ?? '',
                    ]),
                },
            });
        }
        return reply.send({ ok: true, html, filename: `morbeez-${type}-${id.slice(0, 8)}.html` });
    });
    app.get(`${api}/telecaller/leads/:id/share`, async (request, reply) => {
        requireAdmin(request);
        const { id } = request.params;
        const q = request.query;
        const detail = await telecallerAdminService.getLeadDetail(id);
        const phone = String(detail.lead.phone ?? '');
        if (q.type === 'recommendation' && q.recId) {
            const { data } = await supabase.from('crm_recommendations').select('*').eq('id', q.recId).single();
            const share = crmFarmerService.buildWhatsAppMessage('recommendation', {
                problem: data?.problem,
                recommendation: data?.recommendation,
                dosage: data?.dosage,
            }, phone);
            return reply.send({ ok: true, ...share });
        }
        const share = crmFarmerService.buildWhatsAppMessage('lead', {
            name: detail.lead.farmerName,
            phone,
            crop: detail.farmer?.crop,
            territory: detail.farmer?.territory,
        }, phone);
        return reply.send({ ok: true, ...share });
    });
    app.patch(`${api}/telecaller/field-findings/:id`, async (request, reply) => {
        requireAdminRole(request, 'admin', 'manager', 'telecaller');
        const { id } = request.params;
        const body = request.body;
        const finding = await telecallerAdminService.updateFieldFinding(id, body);
        return reply.send({ ok: true, finding });
    });
    app.post(`${api}/telecaller/field-findings/:id/archive`, async (request, reply) => {
        requireAdminRole(request, 'admin', 'manager', 'telecaller');
        const { id } = request.params;
        await crmFarmerService.archiveFieldFinding(id);
        return reply.send({ ok: true });
    });
    app.get(`${api}/escalations`, async (request, reply) => {
        requireAdminRole(request, 'admin', 'manager', 'telecaller');
        const q = request.query;
        const result = await escalationAdminService.list({
            status: q.status ?? 'pending',
            page: q.page ? Number(q.page) : 1,
            limit: q.limit ? Number(q.limit) : 20,
        });
        return reply.send({ ok: true, ...result });
    });
    app.get(`${api}/escalations/:id`, async (request, reply) => {
        requireAdminRole(request, 'admin', 'manager', 'telecaller');
        const { id } = request.params;
        const escalation = await escalationAdminService.getById(id);
        return reply.send({ ok: true, escalation });
    });
    app.patch(`${api}/escalations/:id`, async (request, reply) => {
        requireAdminRole(request, 'admin', 'manager', 'telecaller');
        const admin = requireAdmin(request);
        const { id } = request.params;
        const body = z
            .object({
            status: z.enum(['pending', 'assigned', 'in_review', 'resolved', 'closed']).optional(),
            assignedTo: z.string().optional(),
            agronomistNotes: z.string().max(5000).optional(),
            resolution: z.string().max(2000).optional(),
            correction: z.record(z.unknown()).optional(),
        })
            .parse(request.body);
        const escalation = await escalationAdminService.update(id, body, admin.email);
        return reply.send({ ok: true, escalation });
    });
    app.get(`${api}/inventory`, async (request, reply) => {
        requireAdmin(request);
        const q = request.query;
        const status = q.status === 'in_stock' || q.status === 'low_stock' || q.status === 'out_of_stock'
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
        const q = request.query;
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
        const { id } = request.params;
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
        const { id } = request.params;
        const body = productUpdateSchema.parse(request.body);
        const product = await shopifyProductsService.update(id, body);
        return reply.send({ ok: true, product });
    });
    app.delete(`${api}/products/:id`, async (request, reply) => {
        requireAdminRole(request, 'super_admin', 'admin', 'manager');
        const actor = requireAdmin(request);
        const { id } = request.params;
        const product = await shopifyProductsService.update(id, { status: 'archived' });
        await logAdminMutation({
            actorId: actor.id,
            actorEmail: actor.email,
            action: 'archive',
            resource: 'products',
            resourceId: id,
        });
        return reply.send({ ok: true, product });
    });
    app.post(`${api}/products/:id/images`, async (request, reply) => {
        requireAdminRole(request, 'admin', 'manager');
        const { id } = request.params;
        const body = imageUploadSchema.parse(request.body);
        const image = await shopifyProductsService.uploadImage(id, body);
        return reply.code(201).send({ ok: true, image });
    });
    app.delete(`${api}/products/:id/images/:imageId`, async (request, reply) => {
        requireAdminRole(request, 'admin', 'manager');
        const { id, imageId } = request.params;
        await shopifyProductsService.deleteImage(id, imageId);
        return reply.send({ ok: true });
    });
    app.get(`${api}/products/:id/intelligence`, async (request, reply) => {
        requireAdmin(request);
        const { id } = request.params;
        const intelligence = await productIntelligenceService.get(id);
        return reply.send({ ok: true, intelligence });
    });
    app.post(`${api}/products/wizard`, async (request, reply) => {
        requireAdminRole(request, 'admin', 'manager');
        const admin = requireAdmin(request);
        const body = wizardSaveSchema.parse(request.body);
        const product = await shopifyProductsService.saveWizard(null, body);
        await productIntelligenceService.upsert(product.id, {
            basic: body.intelligence.basic,
            agriculture: body.intelligence.agriculture,
            ai_mapping: body.intelligence.aiMapping,
            seo: body.intelligence.seo,
            cross_sell: body.intelligence.crossSell,
        }, admin.id);
        return reply.code(201).send({ ok: true, product });
    });
    app.put(`${api}/products/:id/wizard`, async (request, reply) => {
        requireAdminRole(request, 'admin', 'manager');
        const admin = requireAdmin(request);
        const { id } = request.params;
        const body = wizardSaveSchema.parse(request.body);
        const product = await shopifyProductsService.saveWizard(id, body);
        await productIntelligenceService.upsert(id, {
            basic: body.intelligence.basic,
            agriculture: body.intelligence.agriculture,
            ai_mapping: body.intelligence.aiMapping,
            seo: body.intelligence.seo,
            cross_sell: body.intelligence.crossSell,
        }, admin.id);
        return reply.send({ ok: true, product });
    });
    app.put(`${api}/products/:id/intelligence`, async (request, reply) => {
        requireAdminRole(request, 'admin', 'manager');
        const admin = requireAdmin(request);
        const { id } = request.params;
        const body = intelligenceSchema.parse(request.body);
        const intelligence = await productIntelligenceService.upsert(id, {
            basic: body.basic,
            agriculture: body.agriculture,
            ai_mapping: body.aiMapping,
            seo: body.seo,
            cross_sell: body.crossSell,
        }, admin.id);
        return reply.send({ ok: true, intelligence });
    });
    await app.register(osFoundationRoutes);
    await app.register(osOperationsRoutes);
    await app.register(osTelecallerRoutes);
    await app.register(osIntelligenceRoutes);
    await app.register(osAgronomistRoutes);
    await app.register(osFieldRoutes);
    await app.register(osAnalyticsRoutes);
    await app.register(osSettingsRoutes);
}
//# sourceMappingURL=admin.routes.js.map