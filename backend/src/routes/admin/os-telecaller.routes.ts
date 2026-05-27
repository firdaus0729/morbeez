import type { FastifyInstance } from 'fastify';
import { z } from 'zod';
import { assertModuleAccess } from '../../lib/rbac.js';
import { supabase } from '../../lib/supabase.js';
import { telecallerAdminService } from '../../services/admin/telecaller-admin.service.js';
import { crmFarmerService, type MasterType } from '../../services/admin/crm-farmer.service.js';
import { whatsappOsAdminService } from '../../services/admin/whatsapp-os-admin.service.js';
import { escalationAdminService } from '../../services/admin/escalation-admin.service.js';

const leadStageEnum = z.enum([
  'new_lead',
  'interested',
  'follow_up',
  'recommendation',
  'order_placed',
  'repeat_customer',
]);

export async function osTelecallerRoutes(app: FastifyInstance): Promise<void> {
  const api = '/console/api/v1/os/telecaller';

  app.get(`${api}/overview`, async (request, reply) => {
    const admin = await assertModuleAccess(request, 'telecaller_crm', 'read');
    const overview = await telecallerAdminService.getOverview(admin.email);
    const { count } = await supabase.from('leads').select('id', { count: 'exact', head: true });
    overview.allLeadsCount = count ?? 0;
    return reply.send({ ok: true, overview });
  });

  app.get(`${api}/nav-badges`, async (request, reply) => {
    await assertModuleAccess(request, 'telecaller_crm', 'read');
    const badges = await telecallerAdminService.getNavBadges();
    return reply.send({ ok: true, badges });
  });

  app.get(`${api}/leads`, async (request, reply) => {
    const admin = await assertModuleAccess(request, 'telecaller_crm', 'read');
    const q = request.query as {
      scope?: string;
      stage?: string;
      search?: string;
      page?: string;
      limit?: string;
    };
    const result = await telecallerAdminService.listLeads(
      {
        scope: q.scope === 'mine' ? 'mine' : 'all',
        stage: q.stage,
        search: q.search,
        page: q.page ? Number(q.page) : 1,
        limit: q.limit ? Number(q.limit) : 30,
      },
      admin.email
    );
    return reply.send({ ok: true, ...result });
  });

  app.get(`${api}/leads/:id`, async (request, reply) => {
    await assertModuleAccess(request, 'telecaller_crm', 'read');
    const { id } = request.params as { id: string };
    const detail = await telecallerAdminService.getLeadDetail(id);
    return reply.send({ ok: true, ...detail });
  });

  app.patch(`${api}/leads/:id`, async (request, reply) => {
    const admin = await assertModuleAccess(request, 'telecaller_crm', 'write');
    const { id } = request.params as { id: string };
    const body = z
      .object({
        stage: leadStageEnum.optional(),
        notes: z.string().optional(),
        followUpAt: z.string().nullable().optional(),
        assignedTo: z.string().nullable().optional(),
        priority: z.string().optional(),
      })
      .parse(request.body);
    const detail = await telecallerAdminService.updateLead(id, body, admin.email);
    return reply.send({ ok: true, ...detail });
  });

  app.post(`${api}/leads/:id/notes`, async (request, reply) => {
    const admin = await assertModuleAccess(request, 'telecaller_crm', 'write');
    const { id } = request.params as { id: string };
    const { note } = z.object({ note: z.string().min(1) }).parse(request.body);
    const detail = await telecallerAdminService.addNote(id, note, admin.email);
    return reply.send({ ok: true, ...detail });
  });

  app.get(`${api}/leads/:id/crm`, async (request, reply) => {
    const admin = await assertModuleAccess(request, 'telecaller_crm', 'read');
    const { id } = request.params as { id: string };
    const detail = await telecallerAdminService.getLeadDetail(id);
    const bundle = await crmFarmerService.getFarmerCrmBundle(
      detail.lead.farmerId as string,
      id,
      admin.email
    );
    return reply.send({ ok: true, ...bundle });
  });

  app.get(`${api}/leads/:id/blocks`, async (request, reply) => {
    await assertModuleAccess(request, 'telecaller_crm', 'read');
    const { id } = request.params as { id: string };
    const detail = await telecallerAdminService.getLeadDetail(id);
    const blocks = await crmFarmerService.ensureDemoBlocks(detail.lead.farmerId as string);
    return reply.send({ ok: true, blocks });
  });

  app.get(`${api}/leads/:leadId/blocks/:blockId/workspace`, async (request, reply) => {
    await assertModuleAccess(request, 'telecaller_crm', 'read');
    const { leadId, blockId } = request.params as { leadId: string; blockId: string };
    const detail = await telecallerAdminService.getLeadDetail(leadId);
    const workspace = await crmFarmerService.getBlockWorkspace(
      detail.lead.farmerId as string,
      blockId
    );
    return reply.send({ ok: true, ...workspace });
  });

  app.get(`${api}/leads/:id/interactions`, async (request, reply) => {
    await assertModuleAccess(request, 'telecaller_crm', 'read');
    const { id } = request.params as { id: string };
    const q = request.query as { page?: string; limit?: string };
    const detail = await telecallerAdminService.getLeadDetail(id);
    const result = await crmFarmerService.listInteractions(
      detail.lead.farmerId as string,
      q.page ? Number(q.page) : 1,
      q.limit ? Number(q.limit) : 20
    );
    return reply.send({ ok: true, ...result });
  });

  app.get(`${api}/leads/:id/recommendations`, async (request, reply) => {
    await assertModuleAccess(request, 'telecaller_crm', 'read');
    const { id } = request.params as { id: string };
    const q = request.query as { page?: string; limit?: string };
    const detail = await telecallerAdminService.getLeadDetail(id);
    const result = await crmFarmerService.listRecommendations(
      detail.lead.farmerId as string,
      q.page ? Number(q.page) : 1,
      q.limit ? Number(q.limit) : 20
    );
    return reply.send({ ok: true, ...result });
  });

  app.get(`${api}/leads/:id/field-findings`, async (request, reply) => {
    await assertModuleAccess(request, 'telecaller_crm', 'read');
    const { id } = request.params as { id: string };
    const q = request.query as { page?: string; limit?: string };
    const detail = await telecallerAdminService.getLeadDetail(id);
    const result = await telecallerAdminService.listFieldFindings(
      detail.lead.farmerId as string,
      q.page ? Number(q.page) : 1,
      q.limit ? Number(q.limit) : 15
    );
    return reply.send({ ok: true, ...result });
  });

  app.get(`${api}/tasks`, async (request, reply) => {
    const admin = await assertModuleAccess(request, 'telecaller_crm', 'read');
    const q = request.query as { status?: string };
    const tasks = await telecallerAdminService.listTasks(admin.email, q.status ?? 'pending');
    return reply.send({ ok: true, tasks });
  });

  app.patch(`${api}/tasks/:id/complete`, async (request, reply) => {
    await assertModuleAccess(request, 'telecaller_crm', 'write');
    const { id } = request.params as { id: string };
    await telecallerAdminService.completeTask(id);
    return reply.send({ ok: true });
  });

  app.get(`${api}/whatsapp/threads`, async (request, reply) => {
    await assertModuleAccess(request, 'telecaller_crm', 'read');
    const threads = await telecallerAdminService.listWhatsAppThreads();
    return reply.send({ ok: true, threads });
  });

  app.get(`${api}/whatsapp/:farmerId/messages`, async (request, reply) => {
    await assertModuleAccess(request, 'telecaller_crm', 'read');
    const { farmerId } = request.params as { farmerId: string };
    const messages = await telecallerAdminService.getWhatsAppMessages(farmerId);
    return reply.send({ ok: true, messages });
  });

  app.post(`${api}/whatsapp/:farmerId/send`, async (request, reply) => {
    const admin = await assertModuleAccess(request, 'telecaller_crm', 'write');
    const { farmerId } = request.params as { farmerId: string };
    const { text } = z.object({ text: z.string().min(1).max(4096) }).parse(request.body);
    const result = await telecallerAdminService.sendWhatsAppMessage(
      farmerId,
      text,
      admin.email
    );
    return reply.send({ ok: true, ...result });
  });

  app.get(`${api}/whatsapp/:farmerId/session`, async (request, reply) => {
    await assertModuleAccess(request, 'telecaller_crm', 'read');
    const { farmerId } = request.params as { farmerId: string };
    const session = await whatsappOsAdminService.getConversationSession(farmerId);
    return reply.send({ ok: true, session });
  });

  app.patch(`${api}/whatsapp/:farmerId/session`, async (request, reply) => {
    await assertModuleAccess(request, 'telecaller_crm', 'write');
    const { farmerId } = request.params as { farmerId: string };
    const body = z
      .object({
        aiPaused: z.boolean().optional(),
        owner: z.enum(['ai', 'telecaller', 'agronomist']).optional(),
        preferredLanguage: z.enum(['en', 'ml', 'ta', 'kn', 'hi']).nullable().optional(),
        activeBlockId: z.string().uuid().nullable().optional(),
      })
      .parse(request.body);
    const session = await whatsappOsAdminService.updateConversationSession(farmerId, {
      ...body,
      activePlotId: body.activeBlockId,
    });
    return reply.send({ ok: true, session });
  });

  app.post(`${api}/leads`, async (request, reply) => {
    const admin = await assertModuleAccess(request, 'telecaller_crm', 'write');
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
    return reply.status(201).send({ ok: true, lead: detail.lead, farmerId: detail.lead.farmerId });
  });

  app.post(`${api}/leads/:id/calls`, async (request, reply) => {
    const admin = await assertModuleAccess(request, 'telecaller_crm', 'write');
    const { id } = request.params as { id: string };
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

  app.post(`${api}/leads/:id/tasks`, async (request, reply) => {
    const admin = await assertModuleAccess(request, 'telecaller_crm', 'write');
    const { id } = request.params as { id: string };
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

  app.post(`${api}/leads/:id/blocks`, async (request, reply) => {
    await assertModuleAccess(request, 'telecaller_crm', 'write');
    const { id } = request.params as { id: string };
    const body = z
      .object({
        name: z.string().min(1),
        area: z.string().optional(),
        cropId: z.string().uuid().optional(),
        cropName: z.string().optional(),
        varietyName: z.string().optional(),
        irrigationTypeId: z.string().uuid().optional(),
        soilTypeId: z.string().uuid().optional(),
        plantingDate: z.string().optional(),
        spacing: z.string().optional(),
      })
      .parse(request.body);
    const detail = await telecallerAdminService.getLeadDetail(id);
    const block = await crmFarmerService.createBlock(detail.lead.farmerId as string, body);
    return reply.status(201).send({ ok: true, block });
  });

  app.patch(`${api}/leads/:leadId/blocks/:blockId`, async (request, reply) => {
    await assertModuleAccess(request, 'telecaller_crm', 'write');
    const { blockId } = request.params as { leadId: string; blockId: string };
    const body = request.body as Record<string, unknown>;
    const block = await crmFarmerService.updateBlock(blockId, body);
    return reply.send({ ok: true, block });
  });

  app.post(`${api}/leads/:id/interactions`, async (request, reply) => {
    const admin = await assertModuleAccess(request, 'telecaller_crm', 'write');
    const { id } = request.params as { id: string };
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
    const interaction = await crmFarmerService.createInteraction(
      detail.lead.farmerId as string,
      id,
      { ...body, doneBy: admin.email, doneByRole: 'Telecaller' }
    );
    return reply.status(201).send({ ok: true, interaction });
  });

  app.post(`${api}/leads/:id/recommendations`, async (request, reply) => {
    const admin = await assertModuleAccess(request, 'telecaller_crm', 'write');
    const { id } = request.params as { id: string };
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
    const rec = await crmFarmerService.createRecommendation(detail.lead.farmerId as string, id, {
      ...body,
      recommendedBy: admin.email,
    });
    return reply.status(201).send({ ok: true, recommendation: rec });
  });

  app.post(`${api}/leads/:id/field-findings`, async (request, reply) => {
    await assertModuleAccess(request, 'telecaller_crm', 'write');
    const { id } = request.params as { id: string };
    const body = z
      .object({
        blockId: z.string().uuid().optional(),
        blockName: z.string().min(1),
        cropType: z.string().min(1),
        observations: z.string().optional(),
        diseasePest: z.string().optional(),
        diseaseTone: z.enum(['healthy', 'warning', 'danger']).optional(),
        actionTaken: z.string().optional(),
        parameters: z.array(z.object({ label: z.string(), value: z.string() })).optional(),
      })
      .parse(request.body);
    const detail = await telecallerAdminService.getLeadDetail(id);
    const finding = await telecallerAdminService.createFieldFinding(
      detail.lead.farmerId as string,
      id,
      body
    );
    return reply.status(201).send({ ok: true, finding });
  });

  app.post(`${api}/leads/:id/schedule-visit`, async (request, reply) => {
    const admin = await assertModuleAccess(request, 'telecaller_crm', 'write');
    const { id } = request.params as { id: string };
    const body = z
      .object({
        title: z.string().optional(),
        dueAt: z.string(),
        notes: z.string().optional(),
        blockId: z.string().uuid().optional(),
      })
      .parse(request.body);
    const detail = await telecallerAdminService.getLeadDetail(id);
    const result = await crmFarmerService.scheduleVisit(detail.lead.farmerId as string, id, {
      ...body,
      assignedTo: admin.email,
    });
    return reply.status(201).send({ ok: true, ...result });
  });

  app.get(`${api}/leads/:id/orders`, async (request, reply) => {
    await assertModuleAccess(request, 'telecaller_crm', 'read');
    const { id } = request.params as { id: string };
    const detail = await telecallerAdminService.getLeadDetail(id);
    const result = await crmFarmerService.listFarmerOrders(detail.lead.farmerId as string);
    return reply.send({ ok: true, ...result });
  });

  app.get(`${api}/orders/catalog`, async (request, reply) => {
    await assertModuleAccess(request, 'telecaller_crm', 'read');
    const q = request.query as { search?: string };
    const items = await crmFarmerService.getOrderCatalog(q.search);
    return reply.send({ ok: true, items });
  });

  app.post(`${api}/leads/:id/orders`, async (request, reply) => {
    const admin = await assertModuleAccess(request, 'telecaller_crm', 'write');
    const { id } = request.params as { id: string };
    const body = z
      .object({
        blockId: z.string().uuid().optional(),
        lineItems: z.array(
          z.object({
            variantId: z.number().optional(),
            title: z.string(),
            quantity: z.number().min(1),
            price: z.number().min(0),
          })
        ),
        paymentMode: z.string().optional(),
        deliveryAddress: z.string().optional(),
        notes: z.string().optional(),
      })
      .parse(request.body);
    const detail = await telecallerAdminService.getLeadDetail(id);
    const order = await crmFarmerService.createManualOrder(detail.lead.farmerId as string, id, {
      ...body,
      createdBy: admin.email,
    });
    return reply.status(201).send({ ok: true, order });
  });

  app.post(`${api}/leads/:id/recommendations/:recId/convert-order`, async (request, reply) => {
    const admin = await assertModuleAccess(request, 'telecaller_crm', 'write');
    const { id, recId } = request.params as { id: string; recId: string };
    const detail = await telecallerAdminService.getLeadDetail(id);
    const order = await crmFarmerService.convertRecommendationToOrder(
      recId,
      detail.lead.farmerId as string,
      id,
      admin.email
    );
    return reply.status(201).send({ ok: true, order });
  });

  app.get(`${api}/masters`, async (request, reply) => {
    await assertModuleAccess(request, 'telecaller_crm', 'read');
    const q = request.query as { type?: string; parentId?: string; search?: string };
    const type = z.string().min(1).parse(q.type ?? 'crop') as MasterType;
    const items = await crmFarmerService.listMasters(type, q.parentId || null, q.search);
    return reply.send({ ok: true, items });
  });

  app.post(`${api}/masters`, async (request, reply) => {
    await assertModuleAccess(request, 'telecaller_crm', 'write');
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
      masterType: body.masterType as MasterType,
      name: body.name,
      parentId: body.parentId,
      category: body.category,
      description: body.description,
    });
    return reply.status(201).send({ ok: true, item });
  });

  app.get(`${api}/leads/:id/export`, async (request, reply) => {
    await assertModuleAccess(request, 'telecaller_crm', 'read');
    const { id } = request.params as { id: string };
    const q = request.query as { type?: string };
    const type = (q.type ?? 'lead') as 'lead' | 'recommendations' | 'findings' | 'interactions';
    const detail = await telecallerAdminService.getLeadDetail(id);
    const farmerId = detail.lead.farmerId as string;
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
    } else if (type === 'recommendations') {
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
    } else if (type === 'interactions') {
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
    } else {
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

  app.get(`${api}/leads/:id/share`, async (request, reply) => {
    await assertModuleAccess(request, 'telecaller_crm', 'read');
    const { id } = request.params as { id: string };
    const q = request.query as { type?: string; recId?: string };
    const detail = await telecallerAdminService.getLeadDetail(id);
    const phone = String(detail.lead.phone ?? '');
    if (q.type === 'recommendation' && q.recId) {
      const { data } = await supabase.from('crm_recommendations').select('*').eq('id', q.recId).single();
      const share = crmFarmerService.buildWhatsAppMessage(
        'recommendation',
        {
          problem: data?.problem,
          recommendation: data?.recommendation,
          dosage: data?.dosage,
        },
        phone
      );
      return reply.send({ ok: true, ...share });
    }
    const share = crmFarmerService.buildWhatsAppMessage(
      'lead',
      {
        name: detail.lead.farmerName,
        phone,
        crop: detail.farmer?.crop,
        territory: detail.farmer?.territory,
      },
      phone
    );
    return reply.send({ ok: true, ...share });
  });

  app.get(`${api}/escalations`, async (request, reply) => {
    await assertModuleAccess(request, 'telecaller_crm', 'read');
    const q = request.query as { status?: string; page?: string; limit?: string };
    const result = await escalationAdminService.list({
      status: q.status ?? 'pending',
      page: q.page ? Number(q.page) : 1,
      limit: q.limit ? Number(q.limit) : 50,
    });
    return reply.send({ ok: true, ...result });
  });

  app.get(`${api}/escalations/:id`, async (request, reply) => {
    await assertModuleAccess(request, 'telecaller_crm', 'read');
    const { id } = request.params as { id: string };
    const escalation = await escalationAdminService.getById(id);
    return reply.send({ ok: true, escalation });
  });

  app.patch(`${api}/escalations/:id`, async (request, reply) => {
    const admin = await assertModuleAccess(request, 'telecaller_crm', 'write');
    const { id } = request.params as { id: string };
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
}
