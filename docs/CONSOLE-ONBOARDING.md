# Morbeez staff portal — onboarding & passwords

## New employee (invite)

1. **Super Admin / Admin** creates an employee in **Employees** (email required).
2. Backend creates a pending `admin_users` row (`active=false`, `email_verified_at` null).
3. **Send setup link** returns: `{CONSOLE_PUBLIC_URL}/accept-invite?token=...`
4. Employee opens the link and sets a **personal password** (min 8 characters, confirmed twice).
5. Account is activated (`email_verified_at` set, `active=true`).
6. They sign in at `/morbeez-staff/login` with **that same personal password**.

## Forgot password (self-service)

1. On the login page, click **Forgot password?**
2. Enter work email → `POST /morbeez-staff/api/v1/auth/forgot-password`
3. Reset link is logged on the API server (until email delivery is wired):  
   `{CONSOLE_PUBLIC_URL}/reset-password?token=...`
4. Employee sets a new personal password (with confirmation).

## Admin-initiated reset

From **Employees** → actions → **Password reset**: generates the same `/reset-password?token=...` link (valid 1 hour).

## Environment

```env
CONSOLE_PUBLIC_URL=https://api-staging.morbeez.in/morbeez-staff
```

`CONSOLE_PUBLIC_URL` must match where the staff SPA is served (basename `/morbeez-staff`).

`CONSOLE_SHARED_PASSWORD` is **no longer used** (legacy shared-password flow removed).

## Database

```bash
supabase db push
```

Migrations:

- `20260623000000_console_invite_onboarding.sql` — `email_verified_at`
- `20260624000000_staff_individual_passwords.sql` — `admin_password_reset_tokens`

## Public APIs

| Method | Path | Body |
|--------|------|------|
| GET | `/morbeez-staff/api/v1/auth/invite?token=` | — |
| POST | `/morbeez-staff/api/v1/auth/complete-invite` | `{ token, password, confirmPassword }` |
| POST | `/morbeez-staff/api/v1/auth/forgot-password` | `{ email }` |
| GET | `/morbeez-staff/api/v1/auth/reset-password?token=` | — |
| POST | `/morbeez-staff/api/v1/auth/complete-reset-password` | `{ token, password, confirmPassword }` |

## Notes

- Each staff member has a **unique** password (scrypt-hashed in `admin_users.password_hash`).
- Direct `POST /morbeez-staff/api/v1/staff` with a password still works for bootstrap (skips invite).
- Login is blocked until `email_verified_at` is set (except `super_admin`).
