import { z } from 'zod';
import { assertModuleAccess } from '../../lib/rbac.js';
import { agIntelligenceService } from '../../services/admin/ag-intelligence.service.js';
export async function osIntelligenceRoutes(app) {
    const api = '/morbeez-staff/api/v1/os/intelligence';
    app.get(`${api}/weather-rules`, async (request, reply) => {
        await assertModuleAccess(request, 'intelligence', 'read');
        const q = request.query;
        const rules = await agIntelligenceService.listWeatherRules({
            status: q.status,
            cropType: q.crop,
        });
        return reply.send({ ok: true, rules });
    });
    app.post(`${api}/weather-rules`, async (request, reply) => {
        const admin = await assertModuleAccess(request, 'intelligence', 'write');
        const body = z
            .object({
            id: z.string().uuid().optional(),
            ruleKey: z.string().min(1),
            version: z.number().int().optional(),
            cropType: z.string().nullable().optional(),
            conditionJson: z.record(z.unknown()).optional(),
            actionType: z.string().min(1),
            actionPayload: z.record(z.unknown()).optional(),
            priority: z.number().int().optional(),
            status: z.enum(['draft', 'approved', 'archived']).optional(),
            notes: z.string().optional(),
        })
            .parse(request.body);
        const rule = await agIntelligenceService.upsertWeatherRule({
            ...body,
            approvedBy: body.status === 'approved' ? admin.email : undefined,
        });
        return reply.send({ ok: true, rule });
    });
    app.get(`${api}/cultivation-tasks`, async (request, reply) => {
        await assertModuleAccess(request, 'intelligence', 'read');
        const q = request.query;
        const tasks = await agIntelligenceService.listCultivationTasks(q.crop);
        return reply.send({ ok: true, tasks });
    });
    app.post(`${api}/cultivation-tasks`, async (request, reply) => {
        await assertModuleAccess(request, 'intelligence', 'write');
        const body = z
            .object({
            id: z.string().uuid().optional(),
            cropType: z.string().min(1),
            taskKey: z.string().min(1),
            titleEn: z.string().min(1),
            titleMl: z.string().optional(),
            instructionsEn: z.string().optional(),
            instructionsMl: z.string().optional(),
            targetDapMin: z.number().int().nullable().optional(),
            targetDapMax: z.number().int().nullable().optional(),
            growthStage: z.string().optional(),
            priority: z.number().int().optional(),
            active: z.boolean().optional(),
        })
            .parse(request.body);
        const task = await agIntelligenceService.upsertCultivationTask(body);
        return reply.status(body.id ? 200 : 201).send({ ok: true, task });
    });
    app.get(`${api}/recommendation-templates`, async (request, reply) => {
        await assertModuleAccess(request, 'intelligence', 'read');
        const q = request.query;
        const templates = await agIntelligenceService.listRecommendationTemplates({
            status: q.status,
            cropType: q.crop,
        });
        return reply.send({ ok: true, templates });
    });
    app.post(`${api}/recommendation-templates`, async (request, reply) => {
        const admin = await assertModuleAccess(request, 'intelligence', 'write');
        const body = z
            .object({
            id: z.string().uuid().optional(),
            cropType: z.string().min(1),
            issueKey: z.string().min(1),
            issueLabelEn: z.string().optional(),
            recommendationTextEn: z.string().min(1),
            recommendationTextMl: z.string().optional(),
            products: z.array(z.unknown()).optional(),
            applicationType: z.string().optional(),
            status: z.enum(['draft', 'approved', 'archived']).optional(),
        })
            .parse(request.body);
        const template = await agIntelligenceService.upsertRecommendationTemplate({
            ...body,
            approvedBy: body.status === 'approved' ? admin.email : undefined,
        });
        return reply.send({ ok: true, template });
    });
    app.get(`${api}/spray-compatibility`, async (request, reply) => {
        await assertModuleAccess(request, 'intelligence', 'read');
        const rules = await agIntelligenceService.listSprayCompatibility();
        return reply.send({ ok: true, rules });
    });
    app.post(`${api}/spray-compatibility`, async (request, reply) => {
        await assertModuleAccess(request, 'intelligence', 'write');
        const body = z
            .object({
            id: z.string().uuid().optional(),
            productA: z.string().min(1),
            productB: z.string().min(1),
            compatible: z.boolean(),
            minIntervalHours: z.number().int().nullable().optional(),
            notes: z.string().optional(),
            active: z.boolean().optional(),
        })
            .parse(request.body);
        const rule = await agIntelligenceService.upsertSprayCompatibility(body);
        return reply.send({ ok: true, rule });
    });
    app.get(`${api}/resistance-rotation`, async (request, reply) => {
        await assertModuleAccess(request, 'intelligence', 'read');
        const q = request.query;
        const rows = await agIntelligenceService.listResistanceRotation(q.crop);
        return reply.send({ ok: true, rows });
    });
    app.post(`${api}/resistance-rotation`, async (request, reply) => {
        await assertModuleAccess(request, 'intelligence', 'write');
        const body = z
            .object({
            id: z.string().uuid().optional(),
            cropType: z.string().min(1),
            modeOfAction: z.string().min(1),
            rotationOrder: z.number().int().min(1),
            technicalName: z.string().min(1),
            notes: z.string().optional(),
            active: z.boolean().optional(),
        })
            .parse(request.body);
        const row = await agIntelligenceService.upsertResistanceRotation(body);
        return reply.send({ ok: true, row });
    });
    app.delete(`${api}/:table/:id`, async (request, reply) => {
        await assertModuleAccess(request, 'intelligence', 'write');
        const { table, id } = request.params;
        const allowed = new Set([
            'cultivation-tasks',
            'recommendation-templates',
            'spray-compatibility',
            'resistance-rotation',
            'weather-rules',
        ]);
        if (!allowed.has(table)) {
            return reply.status(400).send({ ok: false, message: 'Invalid resource' });
        }
        const tableMap = {
            'cultivation-tasks': 'cultivation_task_master',
            'recommendation-templates': 'recommendation_templates',
            'spray-compatibility': 'spray_compatibility_rules',
            'resistance-rotation': 'resistance_rotation_groups',
            'weather-rules': 'weather_rule_definitions',
        };
        await agIntelligenceService.deleteRow(tableMap[table], id);
        return reply.send({ ok: true });
    });
}
//# sourceMappingURL=os-intelligence.routes.js.map