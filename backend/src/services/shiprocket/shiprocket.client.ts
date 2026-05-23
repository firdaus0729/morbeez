import { env } from '../../config/env.js';
import { AppError } from '../../lib/errors.js';
import { logger } from '../../lib/logger.js';

let cachedToken: { token: string; expiresAt: number } | null = null;

export async function getShiprocketToken(): Promise<string> {
  if (cachedToken && Date.now() < cachedToken.expiresAt) {
    return cachedToken.token;
  }

  if (!env.SHIPROCKET_EMAIL || !env.SHIPROCKET_PASSWORD) {
    throw new AppError('Shiprocket not configured', 503, 'SHIPROCKET_NOT_CONFIGURED');
  }

  const res = await fetch('https://apiv2.shiprocket.in/v1/external/auth/login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      email: env.SHIPROCKET_EMAIL,
      password: env.SHIPROCKET_PASSWORD,
    }),
  });

  if (!res.ok) {
    throw new AppError('Shiprocket auth failed', res.status, 'SHIPROCKET_AUTH_FAILED');
  }

  const data = (await res.json()) as { token: string };
  cachedToken = { token: data.token, expiresAt: Date.now() + 9 * 24 * 60 * 60 * 1000 };
  return data.token;
}

export async function shiprocketRequest<T>(path: string, init: RequestInit = {}): Promise<T> {
  const token = await getShiprocketToken();
  const res = await fetch(`https://apiv2.shiprocket.in${path}`, {
    ...init,
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
      ...init.headers,
    },
  });

  if (!res.ok) {
    const text = await res.text();
    logger.error({ status: res.status, path, text }, 'Shiprocket API error');
    throw new AppError(`Shiprocket API ${res.status}`, res.status, 'SHIPROCKET_API_ERROR', text);
  }

  return res.json() as Promise<T>;
}
