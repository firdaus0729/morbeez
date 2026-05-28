/** Canonical Morbeez console staff roles and capability helpers. */
export const CONSOLE_ROLES = [
    'super_admin',
    'admin',
    'operations',
    'telecaller',
    'agronomist',
    'manager',
    'viewer',
];
const STAFF_MANAGEMENT_ROLES = ['super_admin', 'admin'];
const SUPER_ADMIN_ONLY_ROLES = ['super_admin'];
export function normalizeConsoleRole(role) {
    return role.trim().toLowerCase();
}
export function isConsoleRole(role) {
    return CONSOLE_ROLES.includes(role);
}
/** Create/edit staff accounts and assign roles (not approve recommendations). */
export function canManageStaff(role) {
    return STAFF_MANAGEMENT_ROLES.includes(role);
}
/** Promote users to super_admin or change super_admin accounts. */
export function canAssignSuperAdmin(role) {
    return SUPER_ADMIN_ONLY_ROLES.includes(role);
}
/** Final recommendation approval + WhatsApp send (Approvals page). */
export function canApproveRecommendations(role) {
    return role === 'super_admin';
}
/** Default route after login (basename-relative, leading slash). */
export function getRoleHomePath(role) {
    switch (role) {
        case 'operations':
            return '/operations';
        case 'telecaller':
            return '/telecaller';
        case 'agronomist':
            return '/agronomist';
        case 'manager':
            return '/telecaller';
        case 'viewer':
            return '/dashboard';
        case 'admin':
        case 'super_admin':
        default:
            return '/dashboard';
    }
}
/** Roles that may appear in the "new employee" dropdown for the given actor. */
export function assignableRolesForActor(actorRole) {
    if (actorRole === 'super_admin') {
        return [...CONSOLE_ROLES];
    }
    if (actorRole === 'admin') {
        return CONSOLE_ROLES.filter((r) => r !== 'super_admin');
    }
    return [];
}
//# sourceMappingURL=console-roles.js.map