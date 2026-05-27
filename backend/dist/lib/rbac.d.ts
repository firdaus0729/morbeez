import type { FastifyRequest } from 'fastify';
import { type AdminRequest } from '../middleware/adminAuth.js';
export type ConsoleModule = 'dashboard' | 'telecaller_crm' | 'operations' | 'intelligence' | 'agronomist' | 'commerce' | 'automation' | 'analytics' | 'settings' | 'approve_recommendations';
export declare function getModulesForRole(role: string): Promise<Array<{
    moduleKey: string;
    canRead: boolean;
    canWrite: boolean;
}>>;
/** Async guard — call at route start after requireAdmin */
export declare function assertModuleAccess(request: FastifyRequest, moduleKey: ConsoleModule, mode?: 'read' | 'write'): Promise<AdminRequest['admin']>;
export declare function canApproveRecommendations(role: string): boolean;
//# sourceMappingURL=rbac.d.ts.map