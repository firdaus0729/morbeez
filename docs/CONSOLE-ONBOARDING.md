# Console staff onboarding

## Flow

1. **Super Admin / Admin** creates an employee in **Employees** (email required).
2. Backend creates a pending `admin_users` row (`active=false`, `email_verified_at` null).
3. **Send setup link** returns an invite URL: `{CONSOLE_PUBLIC_URL}/accept-invite?token=...`
4. Employee opens the link, enters the **organization password** (`CONSOLE_SHARED_PASSWORD`).
5. Account is activated (`email_verified_at` set, `active=true`) and they sign in at `/console/login` with the same shared password.

## Environment

```env
CONSOLE_SHARED_PASSWORD=your-team-password-min-8-chars
CONSOLE_PUBLIC_URL=https://api-staging.morbeez.in/console
```

`CONSOLE_PUBLIC_URL` must match where the console SPA is served (basename `/console`).

## Database

Apply migration `20260623000000_console_invite_onboarding.sql` (`supabase db push`).

## APIs (public)

- `GET /console/api/v1/auth/invite?token=...` — preview invite
- `POST /console/api/v1/auth/complete-invite` — `{ token, password }`

## Notes

- Invite links are logged on the API server in development (no email provider yet); copy the URL from the Employees modal or server logs.
- Direct `POST /console/api/v1/staff` with a password skips invite (for bootstrap / super admin tooling).
- Login is blocked until `email_verified_at` is set (except `super_admin`).
