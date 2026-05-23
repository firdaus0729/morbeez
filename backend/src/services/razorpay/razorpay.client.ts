import { env } from '../../config/env.js';
import { AppError } from '../../lib/errors.js';

const BASE = 'https://api.razorpay.com/v1';

function authHeader(): string {
  if (!env.RAZORPAY_KEY_ID || !env.RAZORPAY_KEY_SECRET) {
    throw new AppError('Razorpay not configured', 503, 'RAZORPAY_NOT_CONFIGURED');
  }
  const token = Buffer.from(`${env.RAZORPAY_KEY_ID}:${env.RAZORPAY_KEY_SECRET}`).toString('base64');
  return `Basic ${token}`;
}

export async function razorpayRequest<T>(path: string, init: RequestInit = {}): Promise<T> {
  const res = await fetch(`${BASE}${path}`, {
    ...init,
    headers: {
      Authorization: authHeader(),
      'Content-Type': 'application/json',
      ...init.headers,
    },
  });

  if (!res.ok) {
    const body = await res.text();
    throw new AppError(`Razorpay API ${res.status}`, res.status, 'RAZORPAY_API_ERROR', body);
  }

  return res.json() as Promise<T>;
}

export interface PaymentLinkCreate {
  amount: number;
  currency?: string;
  description?: string;
  customer: { name?: string; contact: string; email?: string };
  notify?: { sms?: boolean; email?: boolean };
  reminder_enable?: boolean;
  notes?: Record<string, string>;
}

export interface PaymentLinkResponse {
  id: string;
  short_url: string;
  status: string;
}
