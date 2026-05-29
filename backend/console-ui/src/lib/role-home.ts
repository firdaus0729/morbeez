import { paths, toPath } from './routes';

/** Default landing path after login (relative to /morbeez-staff basename). */
export function getRoleHomePath(role: string | undefined | null): string {
  switch (role) {
    case 'operations':
      return toPath(paths.operations);
    case 'telecaller':
      return toPath(paths.telecaller);
    case 'agronomist':
      return toPath(paths.agronomist);
    case 'manager':
      return toPath(paths.telecaller);
    case 'viewer':
      return toPath(paths.dashboard);
    case 'admin':
    case 'super_admin':
    default:
      return toPath(paths.dashboard);
  }
}

export const ASSIGNABLE_ROLES = [
  'super_admin',
  'admin',
  'operations',
  'telecaller',
  'agronomist',
  'manager',
  'viewer',
] as const;

export function assignableRolesForActor(actorRole: string | undefined): string[] {
  if (actorRole === 'super_admin') return [...ASSIGNABLE_ROLES];
  if (actorRole === 'admin') return ASSIGNABLE_ROLES.filter((r) => r !== 'super_admin');
  return [];
}

export function canManageStaff(actorRole: string | undefined): boolean {
  return actorRole === 'super_admin' || actorRole === 'admin';
}
