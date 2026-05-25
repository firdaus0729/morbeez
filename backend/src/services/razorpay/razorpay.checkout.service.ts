import { createHmac, timingSafeEqual } from 'crypto';
import { env } from '../../config/env.js';
import { AppError, ValidationError } from '../../lib/errors.js';
import { razorpayRequest } from './razorpay.client.js';

export interface RazorpayOrderCreate {
  amount: number;
  currency?: string;
  receipt: string;
  notes?: Record<string, string>;
}

export interface RazorpayOrderResponse {
  id: string;
  amount: number;
  currency: string;
  receipt: string;
  status: string;
}

export const razorpayCheckoutService = {
  getPublicKey(): string {
    if (!env.RAZORPAY_KEY_ID) {
      throw new AppError('Razorpay is not configured', 503, 'RAZORPAY_NOT_CONFIGURED');
    }
    return env.RAZORPAY_KEY_ID;
  },

  async createOrder(input: RazorpayOrderCreate): Promise<RazorpayOrderResponse> {
    if (input.amount < 100) {
      throw new ValidationError('Minimum order amount is ₹1');
    }

    return razorpayRequest<RazorpayOrderResponse>('/orders', {
      method: 'POST',
      body: JSON.stringify({
        amount: Math.round(input.amount),
        currency: input.currency ?? 'INR',
        receipt: input.receipt.slice(0, 40),
        notes: input.notes ?? {},
      }),
    });
  },

  verifyPaymentSignature(orderId: string, paymentId: string, signature: string): boolean {
    if (!env.RAZORPAY_KEY_SECRET) return false;
    const body = `${orderId}|${paymentId}`;
    const expected = createHmac('sha256', env.RAZORPAY_KEY_SECRET).update(body).digest('hex');
    try {
      const a = Buffer.from(expected, 'hex');
      const b = Buffer.from(signature, 'hex');
      return a.length === b.length && timingSafeEqual(a, b);
    } catch {
      return false;
    }
  },
};
