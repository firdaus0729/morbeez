# Morbeez Console RBAC

Seven staff roles control access to `/morbeez-staff` via `role_module_permissions` and JWT session modules.

## Roles

| Role | Home page | Approvals |
|------|-----------|-----------|
| Super Admin | Dashboard | Yes |
| Admin | Dashboard | No |
| Operations | Operations | No |
| Telecaller | Telecaller CRM | No |
| Agronomist | Agronomist hub | No |
| Manager | Telecaller CRM | No |
| Viewer | Dashboard | No |

## Staff management

- **Create employees / assign roles:** Super Admin, Admin only
- **Assign Super Admin role:** Super Admin only

## Apply migration

```powershell
supabase db push
```

Migration: `20260622000000_rbac_roles_permissions.sql` (replaces permission matrix, removes `*.demo@morbeez.in` users).

## Demo cleanup (manual)

```sql
DELETE FROM admin_users WHERE email LIKE '%.demo@morbeez.in';
```

Keep at least one `super_admin` account.
