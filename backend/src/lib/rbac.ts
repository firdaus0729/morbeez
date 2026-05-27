import type { FastifyRequest } from 'fastify';
import { supabase } from './supabase.js';
import { UnauthorizedError } from './errors.js';
import { requireAdmin, type AdminRequest } from '../middleware/adminAuth.js';

export type ConsoleModule =
  | 'dashboard'
  | 'telecaller_crm'
  | 'operations'
  | 'intelligence'
  | 'agronomist'
  | 'commerce'
  | 'automation'
  | 'analytics'
  | 'settings'
  | 'approve_recommendations';

const LEGACY_ROLE_MAP: Record<string, string> = {
  admin: 'super_admin',
  manager: 'operations',
};

function normalizeRole(role: string): string {
  return LEGACY_ROLE_MAP[role] ?? role;
}

export async function getModulesForRole(role: string): Promise<
  Array<{ moduleKey: string; canRead: boolean; canWrite: boolean }>
> {
  const normalized = normalizeRole(role);
  if (normalized === 'super_admin') {
    return [
      'dashboard',
      'telecaller_crm',
      'operations',
      'intelligence',
      'agronomist',
      'commerce',
      'automation',
      'analytics',
      'settings',
      'approve_recommendations',
    ].map((moduleKey) => ({ moduleKey, canRead: true, canWrite: true }));
  }

  const { data, error } = await supabase
    .from('role_module_permissions')
    .select('module_key, can_read, can_write')
    .eq('role', normalized);

  if (error || !data?.length) {
    return [{ moduleKey: 'dashboard', canRead: true, canWrite: false }];
  }

  return data.map((r) => ({
    moduleKey: String(r.module_key),
    canRead: Boolean(r.can_read),
    canWrite: Boolean(r.can_write),
  }));
}

/** Async guard — call at route start after requireAdmin */
export async function assertModuleAccess(
  request: FastifyRequest,
  moduleKey: ConsoleModule,
  mode: 'read' | 'write' = 'read'
): Promise<AdminRequest['admin']> {
  const admin = requireAdmin(request);
  const role = normalizeRole(admin.role);

  if (role === 'super_admin') return admin;

  const { data } = await supabase
    .from('role_module_permissions')
    .select('can_read, can_write')
    .eq('role', role)
    .eq('module_key', moduleKey)
    .maybeSingle();

  const canRead = Boolean(data?.can_read);
  const canWrite = Boolean(data?.can_write);

  if (mode === 'write' && !canWrite) {
    throw new UnauthorizedError(`No write access to ${moduleKey}`);
  }
  if (!canRead && !canWrite) {
    throw new UnauthorizedError(`No access to ${moduleKey}`);
  }

  return admin;
}

export function canApproveRecommendations(role: string): boolean {
  const r = normalizeRole(role);
  return r === 'super_admin';
}
