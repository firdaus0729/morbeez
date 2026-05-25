import type { FastifyRequest } from 'fastify';
import { verifyAdminToken } from '../lib/admin-jwt.js';
import { getBearerToken } from '../lib/jwt.js';
import { UnauthorizedError } from '../lib/errors.js';

export type AdminRequest = FastifyRequest & {
  admin: { id: string; email: string; role: string };
};

export function requireAdmin(request: FastifyRequest): AdminRequest['admin'] {
  const token = getBearerToken(request.headers.authorization);
  if (!token) throw new UnauthorizedError('Admin sign-in required');
  const payload = verifyAdminToken(token);
  return { id: payload.sub, email: payload.email, role: payload.role };
}

export function requireAdminRole(request: FastifyRequest, ...roles: string[]): void {
  const admin = requireAdmin(request);
  if (!roles.includes(admin.role)) {
    throw new UnauthorizedError('Insufficient permissions');
  }
}
