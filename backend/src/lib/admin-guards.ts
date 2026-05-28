export function assertSuperAdminDeactivationAllowed(input: {
  role?: string | null;
  active?: boolean | null;
  activeSuperAdminCount: number;
}): void {
  if (input.role !== 'super_admin' || !input.active) return;
  if (input.activeSuperAdminCount <= 1) {
    throw new Error('Cannot deactivate the last active super admin');
  }
}
