import type { FastifyRequest } from 'fastify';
import { type AdminRequest } from '../middleware/adminAuth.js';
export type ConsoleModule = 'dashboard' | 'telecaller_crm' | 'operations' | 'intelligence' | 'agronomist' | 'commerce' | 'automation' | 'analytics' | 'settings' | 'approve_recommendations';
export { canApproveRecommendations, canManageStaff, canAssignSuperAdmin, getRoleHomePath } from './console-roles.js';
export { CONSOLE_ROLES, type ConsoleRole } from './console-roles.js';
export declare function getModulesForRole(role: string): Promise<Array<{
    moduleKey: string;
    canRead: boolean;
    canWrite: boolean;
}>>;
/** Async guard — call at route start after requireAdmin */
export declare function assertModuleAccess(request: FastifyRequest, moduleKey: ConsoleModule, mode?: 'read' | 'write'): Promise<AdminRequest['admin']>;
export declare function assertStaffManagement(request: FastifyRequest): AdminRequest['admin'];
export declare function assertCanAssignRole(request: FastifyRequest, targetRole: string): AdminRequest['admin'];
//# sourceMappingURL=rbac.d.ts.map