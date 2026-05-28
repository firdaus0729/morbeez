export function assertSuperAdminDeactivationAllowed(input) {
    if (input.role !== 'super_admin' || !input.active)
        return;
    if (input.activeSuperAdminCount <= 1) {
        throw new Error('Cannot deactivate the last active super admin');
    }
}
//# sourceMappingURL=admin-guards.js.map