import { z } from 'zod';
import { env } from '../../config/env.js';
import { assertModuleAccess } from '../../lib/rbac.js';
import { supabase } from '../../lib/supabase.js';
import { throwIfSupabaseError } from '../../lib/supabase-errors.js';
import { whatsappBroadcastAdminService } from '../../services/admin/whatsapp-broadcast-admin.service.js';
import { whatsappOsAdminService } from '../../services/admin/whatsapp-os-admin.service.js';
import { operationsMessagingService } from '../../services/admin/operations-messaging.service.js';
const broadcastKindEnum = z.enum([
    'cultivation_schedule',
    'fertigation_reminder',
    'pgr_broadcast',
    'dap_task',
    'cultivation_knowledge',
]);
export async function osOperationsRoutes(app) {
    const api = '/console/api/v1/os/operations';
    app.get(`${api}/messaging-config`, async (request, reply) => {
        await assertModuleAccess(request, 'operations', 'read');
        return reply.send({
            ok: true,
            config: {
                provider: env.WHATSAPP_PROVIDER,
                broadcastsEnabled: env.ENABLE_WHATSAPP_BROADCASTS,
                broadcastMaxPerDay: env.WHATSAPP_BROADCAST_MAX_PER_DAY,
                broadcastKindCooldownHours: env.WHATSAPP_BROADCAST_KIND_COOLDOWN_HOURS,
                sessionHours: env.WHATSAPP_SESSION_HOURS,
                cultivationFollowUpsEnabled: env.ENABLE_CULTIVATION_FOLLOW_UPS,
                advisoryFollowUpsEnabled: env.ENABLE_ADVISORY_FOLLOW_UPS,
                advisoryAutomationEnabled: env.ENABLE_ADVISORY_AUTOMATION,
                orderAlertsEnabled: env.ENABLE_WHATSAPP_ORDER_ALERTS,
            },
        });
    });
    app.get(`${api}/broadcasts/rules`, async (request, reply) => {
        await assertModuleAccess(request, 'operations', 'read');
        const rules = await whatsappBroadcastAdminService.listRules();
        return reply.send({ ok: true, rules });
    });
    app.get(`${api}/broadcasts/deliveries`, async (request, reply) => {
        await assertModuleAccess(request, 'operations', 'read');
        const q = request.query;
        const deliveries = await whatsappBroadcastAdminService.listDeliveries({
            farmerId: q.farmerId,
            limit: q.limit ? Number(q.limit) : 50,
        });
        return reply.send({ ok: true, deliveries });
    });
    app.post(`${api}/broadcasts/run`, async (request, reply) => {
        await assertModuleAccess(request, 'operations', 'write');
        const body = z
            .object({
            farmerId: z.string().uuid().optional(),
            dryRun: z.boolean().optional(),
            kinds: z.array(broadcastKindEnum).optional(),
        })
            .parse(request.body ?? {});
        const result = await whatsappBroadcastAdminService.runBroadcasts(body);
        return reply.send({ ok: true, result });
    });
    app.post(`${api}/broadcasts/rules`, async (request, reply) => {
        await assertModuleAccess(request, 'operations', 'write');
        const body = z
            .object({
            id: z.string().uuid().optional(),
            cropType: z.string().min(1),
            broadcastKind: broadcastKindEnum,
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
    app.get(`${api}/crop-prices`, async (request, reply) => {
        await assertModuleAccess(request, 'operations', 'read');
        const q = request.query;
        const prices = await whatsappOsAdminService.listCropDailyPrices(q.crop);
        return reply.send({ ok: true, prices });
    });
    app.post(`${api}/crop-prices`, async (request, reply) => {
        await assertModuleAccess(request, 'operations', 'write');
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
    app.get(`${api}/terminology/tasks`, async (request, reply) => {
        await assertModuleAccess(request, 'operations', 'read');
        const q = request.query;
        const tasks = await whatsappOsAdminService.listTerminologyReviewTasks(q.status ?? 'open');
        return reply.send({ ok: true, tasks });
    });
    app.patch(`${api}/terminology/tasks/:id`, async (request, reply) => {
        const admin = await assertModuleAccess(request, 'operations', 'write');
        const { id } = request.params;
        const body = z
            .object({
            status: z.enum(['open', 'in_review', 'resolved', 'dismissed']),
            resolutionMeaning: z.string().max(500).optional(),
            assignedTo: z.string().max(120).optional(),
        })
            .parse(request.body);
        const task = await whatsappOsAdminService.updateTerminologyTask(id, {
            ...body,
            resolvedBy: admin.email,
        });
        return reply.send({ ok: true, task });
    });
    app.get(`${api}/weather-rules`, async (request, reply) => {
        await assertModuleAccess(request, 'operations', 'read');
        const { data, error } = await supabase
            .from('weather_rule_definitions')
            .select('id, rule_key, version, crop_type, action_type, status, effective_from, approved_at')
            .order('rule_key')
            .limit(100);
        throwIfSupabaseError(error, 'Could not load weather rules');
        return reply.send({ ok: true, rules: data ?? [] });
    });
    app.get(`${api}/quick-replies`, async (request, reply) => {
        await assertModuleAccess(request, 'operations', 'read');
        const q = request.query;
        const replies = await operationsMessagingService.listQuickReplies(q.category);
        return reply.send({ ok: true, replies });
    });
    app.post(`${api}/quick-replies`, async (request, reply) => {
        await assertModuleAccess(request, 'operations', 'write');
        const body = z
            .object({
            id: z.string().uuid().optional(),
            shortcutKey: z.string().min(1).max(60),
            category: z.enum(['general', 'telecaller', 'advisory', 'orders', 'broadcast']).optional(),
            labelEn: z.string().min(1),
            bodyEn: z.string().min(1),
            bodyMl: z.string().optional(),
            bodyTa: z.string().optional(),
            bodyKn: z.string().optional(),
            bodyHi: z.string().optional(),
            active: z.boolean().optional(),
            sortOrder: z.number().int().optional(),
        })
            .parse(request.body);
        const reply_row = await operationsMessagingService.upsertQuickReply(body);
        return reply.send({ ok: true, reply: reply_row });
    });
    app.delete(`${api}/quick-replies/:id`, async (request, reply) => {
        await assertModuleAccess(request, 'operations', 'write');
        const { id } = request.params;
        await operationsMessagingService.deleteQuickReply(id);
        return reply.send({ ok: true });
    });
    app.get(`${api}/language-templates`, async (request, reply) => {
        await assertModuleAccess(request, 'operations', 'read');
        const q = request.query;
        const templates = await operationsMessagingService.listLanguageTemplates({
            templateKey: q.templateKey,
            language: q.language,
            status: q.status,
        });
        return reply.send({ ok: true, templates });
    });
    app.post(`${api}/language-templates`, async (request, reply) => {
        await assertModuleAccess(request, 'operations', 'write');
        const body = z
            .object({
            id: z.string().uuid().optional(),
            templateKey: z.string().min(1).max(80),
            language: z.enum(['en', 'ml', 'ta', 'kn', 'hi']),
            channel: z.enum(['session', 'meta_template']).optional(),
            bodyText: z.string().min(1),
            headerText: z.string().optional(),
            footerText: z.string().optional(),
            metaTemplateName: z.string().optional(),
            variableHints: z.array(z.string()).optional(),
            status: z.enum(['draft', 'approved', 'archived']).optional(),
            active: z.boolean().optional(),
            notes: z.string().optional(),
        })
            .parse(request.body);
        const template = await operationsMessagingService.upsertLanguageTemplate(body);
        return reply.send({ ok: true, template });
    });
    app.delete(`${api}/language-templates/:id`, async (request, reply) => {
        await assertModuleAccess(request, 'operations', 'write');
        const { id } = request.params;
        await operationsMessagingService.deleteLanguageTemplate(id);
        return reply.send({ ok: true });
    });
    app.get(`${api}/automation-jobs`, async (request, reply) => {
        await assertModuleAccess(request, 'operations', 'read');
        const q = request.query;
        const result = await operationsMessagingService.listAutomationJobs({
            status: q.status ?? 'active',
            jobType: q.jobType,
            limit: q.limit ? Number(q.limit) : 50,
            page: q.page ? Number(q.page) : 1,
        });
        return reply.send({ ok: true, ...result });
    });
    app.get(`${api}/automation-jobs/stats`, async (request, reply) => {
        await assertModuleAccess(request, 'operations', 'read');
        const stats = await operationsMessagingService.getAutomationStats();
        return reply.send({ ok: true, stats });
    });
    app.post(`${api}/automation-jobs/:id/cancel`, async (request, reply) => {
        await assertModuleAccess(request, 'operations', 'write');
        const { id } = request.params;
        const job = await operationsMessagingService.cancelAutomationJob(id);
        return reply.send({ ok: true, job });
    });
    app.post(`${api}/automation-jobs/:id/retry`, async (request, reply) => {
        await assertModuleAccess(request, 'operations', 'write');
        const { id } = request.params;
        const job = await operationsMessagingService.retryAutomationJob(id);
        return reply.send({ ok: true, job });
    });
}
//# sourceMappingURL=os-operations.routes.js.map