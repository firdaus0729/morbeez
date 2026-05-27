# Morbeez admin console — demo seed data

SQL scripts to populate a **demo** dataset for the React admin console (`/console`). Store this folder in your project archive and run against a Supabase/Postgres database that already has all migrations applied.

## Prerequisites

1. Apply every migration under `supabase/migrations/` (oldest → newest), including:
   - `20260524000000_farmer_website_auth.sql` (fixes Agronomist `farmers` join errors)
   - `20260531000000_crm_masters_blocks.sql` (`block_id` on field findings)
   - `20260531120000_crm_actions.sql` (`archived_at` on field findings)
   - `20260612000000_agronomist_workflow.sql` (`field_finding_id` on recommendations)

   ```powershell
   cd E:\task\india(kata)
   supabase db push
   ```

2. Restart the API after building:

   ```powershell
   cd backend
   npm run build:api
   npm run build:console
   npm start
   ```

## Run order

Execute in this order (Supabase SQL editor, or CLI from repo root):

```powershell
supabase db query --linked -f archive/demo/01_admin_demo_users.sql
supabase db query --linked -f archive/demo/02_farmers_blocks.sql
supabase db query --linked -f archive/demo/03_crm_leads_tasks.sql
supabase db query --linked -f archive/demo/04_field_findings_agronomist.sql
```

| File | Purpose |
|------|---------|
| `01_admin_demo_users.sql` | Staff logins for Employees workspace |
| `02_farmers_blocks.sql` | Demo farmers + farm blocks |
| `03_crm_leads_tasks.sql` | Leads and CRM tasks for telecaller / staff metrics |
| `04_field_findings_agronomist.sql` | Agronomist review queue sample |

## Demo logins

| Email | Password | Role |
|-------|----------|------|
| `admin.demo@morbeez.in` | `Demo@2026` | admin |
| `telecaller.demo@morbeez.in` | `Demo@2026` | manager |
| `agronomist.demo@morbeez.in` | `Demo@2026` | manager |

Use your existing super-admin account if you prefer; demo users are optional.

## Verify in UI

- **Employees** — `http://localhost:10000/console/employees`
- **Agronomist → Field workflow** — `http://localhost:10000/console/agronomist`
- **Telecaller CRM** — `http://localhost:10000/console/telecaller`

## Rollback

Each script uses fixed UUIDs. Re-run is safe (`ON CONFLICT`). To remove demo rows only:

```sql
DELETE FROM recommendation_records WHERE id = 'd0000000-0000-4000-8000-000000000004';
DELETE FROM crm_field_findings WHERE id IN ('d0000000-0000-4000-8000-000000000301','d0000000-0000-4000-8000-000000000302');
DELETE FROM crm_tasks WHERE id LIKE 'd0000000-0000-4000-8000-0000000002%';
DELETE FROM leads WHERE id LIKE 'd0000000-0000-4000-8000-0000000001%';
DELETE FROM farm_blocks WHERE id LIKE 'd0000000-0000-4000-8000-0000000000%';
DELETE FROM farmers WHERE id LIKE 'd0000000-0000-4000-8000-0000000000%';
DELETE FROM admin_users WHERE email LIKE '%.demo@morbeez.in';
```
