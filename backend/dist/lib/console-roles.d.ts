/** Canonical Morbeez console staff roles and capability helpers. */
export declare const CONSOLE_ROLES: readonly ["super_admin", "admin", "operations", "telecaller", "agronomist", "manager", "viewer"];
export type ConsoleRole = (typeof CONSOLE_ROLES)[number];
export declare function normalizeConsoleRole(role: string): string;
export declare function isConsoleRole(role: string): role is ConsoleRole;
/** Create/edit staff accounts and assign roles (not approve recommendations). */
export declare function canManageStaff(role: string): boolean;
/** Promote users to super_admin or change super_admin accounts. */
export declare function canAssignSuperAdmin(role: string): boolean;
/** Final recommendation approval + WhatsApp send (Approvals page). */
export declare function canApproveRecommendations(role: string): boolean;
/** Default route after login (basename-relative, leading slash). */
export declare function getRoleHomePath(role: string): string;
/** Roles that may appear in the "new employee" dropdown for the given actor. */
export declare function assignableRolesForActor(actorRole: string): ConsoleRole[];
//# sourceMappingURL=console-roles.d.ts.map