import type { FastifyInstance } from 'fastify';
import { z } from 'zod';
import { env } from '../../config/env.js';
import { AppError } from '../../lib/errors.js';
import { checkoutService } from '../../services/checkout/checkout.service.js';

function assertCheckoutEnabled(): void {
  if (!env.ENABLE_RAZORPAY_CHECKOUT) {
    throw new AppError('Razorpay checkout is disabled', 503, 'CHECKOUT_DISABLED');
  }
}

const lineItemSchema = z.object({
  variantId: z.number().int().positive(),
  quantity: z.number().int().min(1).max(99),
  title: z.string().optional(),
  price: z.number().int().min(0),
});

const createSchema = z.object({
  lineItems: z.array(lineItemSchema).min(1).max(50),
  customer: z.object({
    email: z.string().email().max(255),
    phone: z.string().min(10).max(15),
    firstName: z.string().min(1).max(80),
    lastName: z.string().min(1).max(80),
    newsletter: z.boolean().optional(),
  }),
  shipping: z.object({
    address1: z.string().min(3).max(200),
    address2: z.string().max(200).optional(),
    city: z.string().min(2).max(100),
    province: z.string().min(2).max(100),
    zip: z.string().min(4).max(12),
    country: z.string().length(2).optional().default('IN'),
  }),
});

const verifySchema = z.object({
  razorpayOrderId: z.string().min(1),
  razorpayPaymentId: z.string().min(1),
  razorpaySignature: z.string().min(1),
});

export async function checkoutRoutes(app: FastifyInstance): Promise<void> {
  app.get('/api/v1/checkout/razorpay/config', async (_request, reply) => {
    const { razorpayCheckoutService } = await import(
      '../../services/razorpay/razorpay.checkout.service.js'
    );
    return reply.send({
      ok: true,
      keyId: razorpayCheckoutService.getPublicKey(),
      currency: 'INR',
    });
  });

  app.post('/api/v1/checkout/razorpay/create', async (request, reply) => {
    assertCheckoutEnabled();
    const body = createSchema.parse(request.body);
    const result = await checkoutService.createRazorpayCheckout(body);
    return reply.send({ ok: true, ...result });
  });

  app.post('/api/v1/checkout/razorpay/verify', async (request, reply) => {
    assertCheckoutEnabled();
    const body = verifySchema.parse(request.body);
    const result = await checkoutService.verifyAndComplete(body);
    return reply.send({ ok: true, ...result });
  });
}
