import type { FastifyInstance } from 'fastify';
import { z } from 'zod';
import { assertModuleAccess } from '../../lib/rbac.js';
import { fieldPwaService } from '../../services/admin/field-pwa.service.js';

const photoSchema = z.object({
  filename: z.string().min(1).max(200),
  mimeType: z.string().min(3).max(80),
  dataBase64: z.string().min(10).max(7_000_000),
});

export async function osFieldRoutes(app: FastifyInstance): Promise<void> {
  const api = '/console/api/v1/os/field';

  app.get(`${api}/farmers/search`, async (request, reply) => {
    await assertModuleAccess(request, 'agronomist', 'read');
    const q = request.query as { q?: string; limit?: string };
    const farmers = await fieldPwaService.searchFarmers(
      q.q ?? '',
      q.limit ? Number(q.limit) : 20
    );
    return reply.send({ ok: true, farmers });
  });

  app.get(`${api}/farmers/:farmerId/blocks`, async (request, reply) => {
    await assertModuleAccess(request, 'agronomist', 'read');
    const { farmerId } = request.params as { farmerId: string };
    const blocks = await fieldPwaService.getFarmerBlocks(farmerId);
    return reply.send({ ok: true, blocks });
  });

  app.get(`${api}/questionnaire/:cropType`, async (request, reply) => {
    await assertModuleAccess(request, 'agronomist', 'read');
    const { cropType } = request.params as { cropType: string };
    const questions = await fieldPwaService.getQuestionnaire(cropType);
    return reply.send({ ok: true, questions });
  });

  app.get(`${api}/visits/recent`, async (request, reply) => {
    const admin = await assertModuleAccess(request, 'agronomist', 'read');
    const q = request.query as { limit?: string };
    const visits = await fieldPwaService.listRecentVisits(
      admin.email,
      q.limit ? Number(q.limit) : 15
    );
    return reply.send({ ok: true, visits });
  });

  app.post(`${api}/visits`, async (request, reply) => {
    const admin = await assertModuleAccess(request, 'agronomist', 'write');
    const body = z
      .object({
        farmerId: z.string().uuid(),
        blockId: z.string().uuid(),
        blockName: z.string().min(1),
        cropType: z.string().min(1),
        leadId: z.string().uuid().optional(),
        observations: z.string().max(8000).optional(),
        diseasePest: z.string().max(500).optional(),
        diseaseTone: z.enum(['healthy', 'warning', 'danger']).optional(),
        actionTaken: z.string().max(2000).optional(),
        answers: z
          .array(
            z.object({
              questionKey: z.string(),
              label: z.string(),
              value: z.string(),
            })
          )
          .default([]),
        photos: z.array(photoSchema).max(8).optional(),
      })
      .parse(request.body);

    const result = await fieldPwaService.submitVisit({
      ...body,
      agronomistName: admin.email,
      agronomistEmail: admin.email,
    });

    return reply.status(201).send({ ok: true, ...result });
  });
}
