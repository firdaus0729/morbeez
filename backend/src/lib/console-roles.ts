/** Canonical Morbeez console staff roles and capability helpers. */

export const CONSOLE_ROLES = [
  'super_admin',
  'admin',
  'operations',
  'telecaller',
  'agronomist',
  'manager',
  'viewer',
] as const;

export type ConsoleRole = (typeof CONSOLE_ROLES)[number];

const STAFF_MANAGEMENT_ROLES: ConsoleRole[] = ['super_admin', 'admin'];

const SUPER_ADMIN_ONLY_ROLES: ConsoleRole[] = ['super_admin'];

export function normalizeConsoleRole(role: string): string {
  return role.trim().toLowerCase();
}

export function isConsoleRole(role: string): role is ConsoleRole {
  return (CONSOLE_ROLES as readonly string[]).includes(role);
}

/** Create/edit staff accounts and assign roles (not approve recommendations). */
export function canManageStaff(role: string): boolean {
  return STAFF_MANAGEMENT_ROLES.includes(role as ConsoleRole);
}

/** Promote users to super_admin or change super_admin accounts. */
export function canAssignSuperAdmin(role: string): boolean {
  return SUPER_ADMIN_ONLY_ROLES.includes(role as ConsoleRole);
}

/** Final recommendation approval + WhatsApp send (Approvals page). */
export function canApproveRecommendations(role: string): boolean {
  return role === 'super_admin';
}

/** Default route after login (basename-relative, leading slash). */
export function getRoleHomePath(role: string): string {
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
export function assignableRolesForActor(actorRole: string): ConsoleRole[] {
  if (actorRole === 'super_admin') {
    return [...CONSOLE_ROLES];
  }
  if (actorRole === 'admin') {
    return CONSOLE_ROLES.filter((r) => r !== 'super_admin');
  }
  return [];
}
