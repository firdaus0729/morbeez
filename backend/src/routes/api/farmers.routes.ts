import type { FastifyInstance } from 'fastify';
import { z } from 'zod';
import { verifyInternalApiKey } from '../../middleware/webhookVerify.js';
import { farmerService } from '../../services/farmer/farmer.service.js';

const upsertSchema = z.object({
  phone: z.string().min(10),
  name: z.string().optional(),
  preferredLanguage: z.enum(['en', 'ml', 'ta', 'kn', 'hi']).optional(),
  district: z.string().optional(),
  state: z.string().optional(),
  shopifyCustomerId: z.string().optional(),
});

const cropSchema = z.object({
  cropType: z.string().min(1),
  acreage: z.number().positive().optional(),
  stage: z.string().optional(),
  isPrimary: z.boolean().optional(),
});

export async function farmersRoutes(app: FastifyInstance): Promise<void> {
  app.addHook('preHandler', (request, _reply, done) => {
    verifyInternalApiKey(request);
    done();
  });

  app.post('/api/v1/farmers', async (request) => {
    const body = upsertSchema.parse(request.body);
    return farmerService.upsertByPhone(body);
  });

  app.get('/api/v1/farmers/:id', async (request) => {
    const { id } = request.params as { id: string };
    return farmerService.getById(id);
  });

  app.post('/api/v1/farmers/:id/crops', async (request) => {
    const { id } = request.params as { id: string };
    const body = cropSchema.parse(request.body);
    return farmerService.addCrop(id, body);
  });
}
