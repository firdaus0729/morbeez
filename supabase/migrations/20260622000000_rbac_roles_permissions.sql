-- RBAC: seven console roles with module read/write matrix (Morbeez staff console)

-- ─── Normalize allowed roles on admin_users ─────────────────
ALTER TABLE admin_users DROP CONSTRAINT IF EXISTS admin_users_role_check;

ALTER TABLE admin_users
  ADD CONSTRAINT admin_users_role_check CHECK (
    role IN (
      'super_admin',
      'admin',
      'operations',
      'telecaller',
      'agronomist',
      'manager',
      'viewer'
    )
  );

-- Remove demo seed logins (archive/demo)
DELETE FROM employee_access_tokens
WHERE employee_profile_id IN (
  SELECT id FROM employee_profiles
  WHERE email LIKE '%.demo@morbeez.in'
     OR admin_user_id IN (SELECT id FROM admin_users WHERE email LIKE '%.demo@morbeez.in')
);

DELETE FROM employee_profiles WHERE email LIKE '%.demo@morbeez.in';

DELETE FROM admin_users WHERE email LIKE '%.demo@morbeez.in';

-- ─── Replace module permissions ─────────────────────────────
DELETE FROM role_module_permissions;

INSERT INTO role_module_permissions (role, module_key, can_read, can_write) VALUES
  -- super_admin: full access
  ('super_admin', 'dashboard', true, true),
  ('super_admin', 'telecaller_crm', true, true),
  ('super_admin', 'operations', true, true),
  ('super_admin', 'intelligence', true, true),
  ('super_admin', 'agronomist', true, true),
  ('super_admin', 'commerce', true, true),
  ('super_admin', 'automation', true, true),
  ('super_admin', 'analytics', true, true),
  ('super_admin', 'settings', true, true),
  ('super_admin', 'approve_recommendations', true, true),

  -- admin: platform ops, no recommendation approval
  ('admin', 'dashboard', true, true),
  ('admin', 'telecaller_crm', true, true),
  ('admin', 'operations', true, true),
  ('admin', 'intelligence', true, true),
  ('admin', 'agronomist', true, false),
  ('admin', 'commerce', true, true),
  ('admin', 'automation', true, true),
  ('admin', 'analytics', true, true),
  ('admin', 'settings', true, true),

  -- operations: messaging, automation, commerce
  ('operations', 'dashboard', true, false),
  ('operations', 'telecaller_crm', true, true),
  ('operations', 'operations', true, true),
  ('operations', 'intelligence', true, false),
  ('operations', 'commerce', true, true),
  ('operations', 'automation', true, true),
  ('operations', 'analytics', true, false),

  -- telecaller: CRM primary
  ('telecaller', 'dashboard', true, false),
  ('telecaller', 'telecaller_crm', true, true),
  ('telecaller', 'commerce', true, false),

  -- agronomist: field workflow + intelligence
  ('agronomist', 'dashboard', true, false),
  ('agronomist', 'telecaller_crm', true, false),
  ('agronomist', 'intelligence', true, true),
  ('agronomist', 'agronomist', true, true),
  ('agronomist', 'commerce', true, false),
  ('agronomist', 'analytics', true, false),

  -- manager: team oversight
  ('manager', 'dashboard', true, true),
  ('manager', 'telecaller_crm', true, true),
  ('manager', 'operations', true, false),
  ('manager', 'intelligence', true, false),
  ('manager', 'agronomist', true, false),
  ('manager', 'commerce', true, false),
  ('manager', 'automation', true, false),
  ('manager', 'analytics', true, true),
  ('manager', 'settings', true, false),

  -- viewer: read-only slices
  ('viewer', 'dashboard', true, false),
  ('viewer', 'telecaller_crm', true, false),
  ('viewer', 'commerce', true, false),
  ('viewer', 'analytics', true, false);

COMMENT ON TABLE role_module_permissions IS 'Console RBAC: role × module (read/write) for /console UI and API guards';
