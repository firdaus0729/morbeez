import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { assertSuperAdminDeactivationAllowed } from '../src/lib/admin-guards.js';

describe('assertSuperAdminDeactivationAllowed', () => {
  it('allows non-super-admin users', () => {
    assert.doesNotThrow(() =>
      assertSuperAdminDeactivationAllowed({
        role: 'admin',
        active: true,
        activeSuperAdminCount: 1,
      })
    );
  });

  it('allows deactivation when multiple active super admins exist', () => {
    assert.doesNotThrow(() =>
      assertSuperAdminDeactivationAllowed({
        role: 'super_admin',
        active: true,
        activeSuperAdminCount: 2,
      })
    );
  });

  it('blocks deactivation of the last active super admin', () => {
    assert.throws(
      () =>
        assertSuperAdminDeactivationAllowed({
          role: 'super_admin',
          active: true,
          activeSuperAdminCount: 1,
        }),
      /last active super admin/i
    );
  });
});
