import type { FastifyInstance } from 'fastify';
import { z } from 'zod';
import { verifyInternalApiKey } from '../../middleware/webhookVerify.js';
import { leadService } from '../../services/crm/lead.service.js';
import { razorpayService } from '../../services/razorpay/razorpay.service.js';

const leadSchema = z.object({
  phone: z.string().min(10),
  name: z.string().optional(),
  intent: z.enum(['quotation', 'callback', 'support', 'dealer', 'general']),
  source: z.enum(['web', 'whatsapp', 'shopify', 'phone']),
  notes: z.string().optional(),
  cropType: z.string().optional(),
  district: z.string().optional(),
});

const paymentLinkSchema = z.object({
  amountPaise: z.number().int().positive(),
  phone: z.string(),
  name: z.string().optional(),
  description: z.string().optional(),
  quotationId: z.string().uuid().optional(),
});

export async function leadsRoutes(app: FastifyInstance): Promise<void> {
  app.addHook('preHandler', (request, _reply, done) => {
    verifyInternalApiKey(request);
    done();
  });

  app.post('/api/v1/leads', async (request) => {
    const body = leadSchema.parse(request.body);
    return leadService.createLead(body);
  });

  app.get('/api/v1/leads', async (request) => {
    const { status } = request.query as { status?: string };
    return leadService.listLeads(status);
  });

  app.post('/api/v1/payments/link', async (request) => {
    const body = paymentLinkSchema.parse(request.body);
    return razorpayService.createPaymentLink({
      amount: body.amountPaise,
      description: body.description,
      quotationId: body.quotationId,
      customer: { contact: body.phone, name: body.name },
    });
  });
}
