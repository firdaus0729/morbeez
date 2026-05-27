-- Demo staff accounts for Morbeez admin console (Employees workspace)
-- Password for all: Demo@2026
-- Requires: 20260525000000_admin_users.sql

INSERT INTO admin_users (id, email, password_hash, full_name, role, active, last_login_at)
VALUES
  (
    'a0000000-0000-4000-8000-000000000001',
    'admin.demo@morbeez.in',
    'b7a2b84280518791dec9d28e13e94201:273f9247e045167ef101adab5786ec5ccb50cfb9df70e732a4401cf7b4b41b39e240d10aa7ef77a372786faf1bf7304d04c81de56bb36c62729283dc30e8c0fe',
    'Demo Admin',
    'admin',
    true,
    NOW() - INTERVAL '5 minutes'
  ),
  (
    'a0000000-0000-4000-8000-000000000002',
    'telecaller.demo@morbeez.in',
    'b7a2b84280518791dec9d28e13e94201:273f9247e045167ef101adab5786ec5ccb50cfb9df70e732a4401cf7b4b41b39e240d10aa7ef77a372786faf1bf7304d04c81de56bb36c62729283dc30e8c0fe',
    'Priya Telecaller',
    'manager',
    true,
    NOW() - INTERVAL '2 hours'
  ),
  (
    'a0000000-0000-4000-8000-000000000003',
    'agronomist.demo@morbeez.in',
    'b7a2b84280518791dec9d28e13e94201:273f9247e045167ef101adab5786ec5ccb50cfb9df70e732a4401cf7b4b41b39e240d10aa7ef77a372786faf1bf7304d04c81de56bb36c62729283dc30e8c0fe',
    'Dr. Anil Agronomist',
    'manager',
    true,
    NOW() - INTERVAL '1 day'
  )
ON CONFLICT (email) DO UPDATE SET
  full_name = EXCLUDED.full_name,
  role = EXCLUDED.role,
  active = EXCLUDED.active,
  last_login_at = EXCLUDED.last_login_at,
  password_hash = EXCLUDED.password_hash;
