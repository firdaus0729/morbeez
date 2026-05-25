import { createHmac, timingSafeEqual } from 'crypto';
import { env } from '../config/env.js';
import { UnauthorizedError } from './errors.js';

export interface FarmerTokenPayload {
  sub: string;
  email: string;
  exp: number;
}

function base64url(input: string | Buffer): string {
  return Buffer.from(input)
    .toString('base64')
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/, '');
}

function sign(data: string): string {
  return createHmac('sha256', env.FARMER_JWT_SECRET).update(data).digest('base64url');
}

export function createFarmerToken(farmerId: string, email: string, ttlDays = 30): string {
  const header = base64url(JSON.stringify({ alg: 'HS256', typ: 'JWT' }));
  const exp = Math.floor(Date.now() / 1000) + ttlDays * 86400;
  const payload = base64url(JSON.stringify({ sub: farmerId, email, exp }));
  const signature = sign(`${header}.${payload}`);
  return `${header}.${payload}.${signature}`;
}

export function verifyFarmerToken(token: string): FarmerTokenPayload {
  const parts = token.split('.');
  if (parts.length !== 3) throw new UnauthorizedError('Invalid session');

  const [header, payload, signature] = parts;
  const expected = sign(`${header}.${payload}`);
  const a = Buffer.from(signature);
  const b = Buffer.from(expected);
  if (a.length !== b.length || !timingSafeEqual(a, b)) {
    throw new UnauthorizedError('Invalid session');
  }

  let decoded: FarmerTokenPayload;
  try {
    decoded = JSON.parse(Buffer.from(payload.replace(/-/g, '+').replace(/_/g, '/'), 'base64').toString());
  } catch {
    throw new UnauthorizedError('Invalid session');
  }

  if (!decoded.sub || !decoded.exp || decoded.exp < Math.floor(Date.now() / 1000)) {
    throw new UnauthorizedError('Session expired');
  }

  return decoded;
}

export function getBearerToken(authorization: string | undefined): string | null {
  if (!authorization?.startsWith('Bearer ')) return null;
  return authorization.slice(7).trim() || null;
}
