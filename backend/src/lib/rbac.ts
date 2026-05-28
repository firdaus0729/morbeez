import type { FastifyRequest } from 'fastify';
import { supabase } from './supabase.js';
import { UnauthorizedError } from './errors.js';
import { requireAdmin, type AdminRequest } from '../middleware/adminAuth.js';
import { canAssignSuperAdmin, canManageStaff } from './console-roles.js';

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

export { canApproveRecommendations, canManageStaff, canAssignSuperAdmin, getRoleHomePath } from './console-roles.js';
export { CONSOLE_ROLES, type ConsoleRole } from './console-roles.js';

export async function getModulesForRole(role: string): Promise<
  Array<{ moduleKey: string; canRead: boolean; canWrite: boolean }>
> {
  if (role === 'super_admin') {
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
    .eq('role', role);

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
  const role = admin.role;

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

export function assertStaffManagement(request: FastifyRequest): AdminRequest['admin'] {
  const admin = requireAdmin(request);
  if (!canManageStaff(admin.role)) {
    throw new UnauthorizedError('Staff management requires Admin or Super Admin');
  }
  return admin;
}

export function assertCanAssignRole(
  request: FastifyRequest,
  targetRole: string
): AdminRequest['admin'] {
  const admin = assertStaffManagement(request);
  if (targetRole === 'super_admin' && !canAssignSuperAdmin(admin.role)) {
    throw new UnauthorizedError('Only Super Admin can assign the Super Admin role');
  }
  return admin;
}
