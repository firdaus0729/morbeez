import type { FastifyInstance } from 'fastify';
import { z } from 'zod';
import { requireAdmin } from '../../middleware/adminAuth.js';
import {
  assertModuleAccess,
  canApproveRecommendations,
  getModulesForRole,
} from '../../lib/rbac.js';
import { blockService } from '../../services/core/block.service.js';
import { pincodeService } from '../../services/core/pincode.service.js';
import { recommendationRecordsService } from '../../services/core/recommendation-records.service.js';
import { recommendationCommunicationService } from '../../services/core/recommendation-communication.service.js';
import { productGapService } from '../../services/core/product-gap.service.js';
import { recommendationFollowUpService } from '../../services/core/recommendation-follow-up.service.js';
import { UnauthorizedError } from '../../lib/errors.js';

const blockCreateSchema = z.object({
  name: z.string().min(1).max(120),
  cropType: z.string().min(1).max(60),
  cropCategory: z.string().max(60).optional(),
  cropSubtype: z.string().max(60).optional(),
  varietyName: z.string().max(80).optional(),
  plantingDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
  acreage: z.number().min(0).max(9999).optional(),
  irrigationType: z.string().max(40).optional(),
  pincodeId: z.string().uuid().optional(),
  plotLabel: z.string().max(80).optional(),
  isPrimary: z.boolean().optional(),
  stage: z.string().max(60).optional(),
});

const recommendationCreateSchema = z.object({
  farmerId: z.string().uuid(),
  blockId: z.string().uuid().optional(),
  leadId: z.string().uuid().optional(),
  source: z.enum(['ai', 'agronomist', 'rule', 'template', 'field_finding']).default('agronomist'),
  issueDetected: z.string().max(500).optional(),
  recommendationText: z.string().min(1).max(8000),
  products: z.array(z.unknown()).optional(),
  dosage: z.string().max(2000).optional(),
  applicationType: z.string().max(120).optional(),
  weatherWarning: z.string().max(500).optional(),
  language: z.enum(['en', 'ml', 'ta', 'kn', 'hi']).optional(),
});

const outcomeSchema = z.object({
  outcome: z.enum(['better', 'partial', 'no_improvement', 'unknown']),
  notes: z.string().max(2000).optional(),
});

export async function osFoundationRoutes(app: FastifyInstance): Promise<void> {
  const api = '/console/api/v1/os';

  app.get(`${api}/session`, async (request, reply) => {
    const admin = requireAdmin(request);
    const modules = await getModulesForRole(admin.role);
    return reply.send({
      ok: true,
      admin: { id: admin.id, email: admin.email, role: admin.role },
      modules,
      canApproveRecommendations: canApproveRecommendations(admin.role),
    });
  });

  app.get(`${api}/pincodes/lookup/:pincode`, async (request, reply) => {
    await assertModuleAccess(request, 'intelligence', 'read');
    const { pincode } = request.params as { pincode: string };
    const row = await pincodeService.lookupByPincode(pincode);
    return reply.send({ ok: true, pincode: row });
  });

  app.get(`${api}/pincodes`, async (request, reply) => {
    await assertModuleAccess(request, 'intelligence', 'read');
    const q = request.query as { district?: string; q?: string; limit?: string };
    const rows = await pincodeService.search({
      district: q.district,
      q: q.q,
      limit: q.limit ? Number(q.limit) : 50,
    });
    return reply.send({ ok: true, pincodes: rows });
  });

  app.post(`${api}/farmers/:farmerId/pincode`, async (request, reply) => {
    await assertModuleAccess(request, 'telecaller_crm', 'write');
    const { farmerId } = request.params as { farmerId: string };
    const body = z.object({ pincode: z.string().min(6).max(6) }).parse(request.body);
    const row = await pincodeService.assignFarmerPincode(farmerId, body.pincode);
    if (!row) return reply.code(404).send({ ok: false, message: 'Pincode not found in master' });
    return reply.send({ ok: true, pincode: row });
  });

  app.get(`${api}/farmers/:farmerId/blocks`, async (request, reply) => {
    await assertModuleAccess(request, 'telecaller_crm', 'read');
    const { farmerId } = request.params as { farmerId: string };
    const blocks = await blockService.listByFarmer(farmerId);
    return reply.send({ ok: true, blocks });
  });

  app.post(`${api}/farmers/:farmerId/blocks`, async (request, reply) => {
    await assertModuleAccess(request, 'agronomist', 'write');
    const { farmerId } = request.params as { farmerId: string };
    const body = blockCreateSchema.parse(request.body);
    const block = await blockService.createBlock(farmerId, body);
    return reply.code(201).send({ ok: true, block });
  });

  app.get(`${api}/blocks/:blockId`, async (request, reply) => {
    await assertModuleAccess(request, 'telecaller_crm', 'read');
    const { blockId } = request.params as { blockId: string };
    const q = request.query as { farmerId?: string };
    const block = await blockService.getById(blockId, q.farmerId);
    if (!block) return reply.code(404).send({ ok: false, message: 'Block not found' });
    return reply.send({ ok: true, block });
  });

  app.get(`${api}/recommendations/pending`, async (request, reply) => {
    const admin = await assertModuleAccess(request, 'approve_recommendations', 'read');
    if (!canApproveRecommendations(admin.role)) {
      throw new UnauthorizedError('Only super admin can view approval queue');
    }
    const q = request.query as { limit?: string };
    const rows = await recommendationRecordsService.listPendingApproval(
      q.limit ? Number(q.limit) : 50
    );
    return reply.send({ ok: true, recommendations: rows });
  });

  app.get(`${api}/farmers/:farmerId/recommendations`, async (request, reply) => {
    await assertModuleAccess(request, 'telecaller_crm', 'read');
    const { farmerId } = request.params as { farmerId: string };
    const rows = await recommendationRecordsService.listByFarmer(farmerId);
    return reply.send({ ok: true, recommendations: rows });
  });

  app.post(`${api}/recommendations`, async (request, reply) => {
    const admin = await assertModuleAccess(request, 'agronomist', 'write');
    const body = recommendationCreateSchema.parse(request.body);
    const row = await recommendationRecordsService.create({
      ...body,
      createdBy: admin.email,
      status: body.source === 'agronomist' ? 'pending_approval' : undefined,
    });
    return reply.code(201).send({ ok: true, recommendation: row });
  });

  app.post(`${api}/recommendations/:id/submit`, async (request, reply) => {
    const admin = await assertModuleAccess(request, 'agronomist', 'write');
    const { id } = request.params as { id: string };
    const row = await recommendationRecordsService.submitForApproval(id, admin.email);
    return reply.send({ ok: true, recommendation: row });
  });

  app.post(`${api}/recommendations/:id/approve`, async (request, reply) => {
    const admin = await assertModuleAccess(request, 'approve_recommendations', 'write');
    if (!canApproveRecommendations(admin.role)) {
      throw new UnauthorizedError('Only super admin can approve recommendations');
    }
    const { id } = request.params as { id: string };
    const body = z
      .object({ sendWhatsApp: z.boolean().optional().default(true) })
      .parse(request.body ?? {});
    const row = await recommendationRecordsService.approve(id, admin.email);
    let whatsapp: { sent: boolean; reason?: string; message?: string } = { sent: false };
    if (body.sendWhatsApp) {
      whatsapp = await recommendationCommunicationService.sendApprovedRecommendation(id);
    }
    return reply.send({ ok: true, recommendation: row, whatsapp });
  });

  app.post(`${api}/recommendations/:id/reject`, async (request, reply) => {
    const admin = await assertModuleAccess(request, 'approve_recommendations', 'write');
    if (!canApproveRecommendations(admin.role)) {
      throw new UnauthorizedError('Only super admin can reject recommendations');
    }
    const { id } = request.params as { id: string };
    const body = z.object({ notes: z.string().max(2000).optional() }).parse(request.body ?? {});
    const row = await recommendationRecordsService.reject(id, admin.email, body.notes);
    return reply.send({ ok: true, recommendation: row });
  });

  app.post(`${api}/recommendations/:id/outcome`, async (request, reply) => {
    await assertModuleAccess(request, 'agronomist', 'write');
    const { id } = request.params as { id: string };
    const body = outcomeSchema.parse(request.body);
    const row = await recommendationRecordsService.recordOutcome(id, body.outcome, body.notes);
    return reply.send({ ok: true, recommendation: row });
  });

  app.get(`${api}/product-gaps`, async (request, reply) => {
    await assertModuleAccess(request, 'intelligence', 'read');
    const q = request.query as { limit?: string };
    const rows = await productGapService.listOpen(q.limit ? Number(q.limit) : 50);
    return reply.send({ ok: true, gaps: rows });
  });

  app.get(`${api}/recommendations/follow-up/kpis`, async (request, reply) => {
    await assertModuleAccess(request, 'analytics', 'read');
    const q = request.query as { days?: string };
    const kpis = await recommendationFollowUpService.getKpis(q.days ? Number(q.days) : 30);
    return reply.send({ ok: true, kpis });
  });

  app.get(`${api}/recommendations/:id/follow-up`, async (request, reply) => {
    await assertModuleAccess(request, 'telecaller_crm', 'read');
    const { id } = request.params as { id: string };
    const detail = await recommendationFollowUpService.getTelecallerFollowUpDetail(id);
    if (!detail) return reply.code(404).send({ ok: false, message: 'Recommendation not found' });
    return reply.send({ ok: true, ...detail });
  });
}
