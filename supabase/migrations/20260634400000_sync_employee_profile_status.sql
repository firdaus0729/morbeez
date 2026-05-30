-- Align employee_profiles.status with admin_users.active for linked accounts.

UPDATE employee_profiles ep
SET status = 'inactive', updated_at = NOW()
FROM admin_users au
WHERE ep.admin_user_id = au.id
  AND au.active = false
  AND ep.status = 'active';

UPDATE employee_profiles ep
SET status = 'active', updated_at = NOW()
FROM admin_users au
WHERE ep.admin_user_id = au.id
  AND au.active = true
  AND ep.status = 'inactive';
