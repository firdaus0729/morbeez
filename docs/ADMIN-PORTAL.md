# Morbeez Admin Portal

Staff console for managing **Shopify products** and **registered farmers** — separate from the public storefront and farmer login.

## URL

| Environment | Admin URL |
|-------------|-----------|
| Local API | `http://localhost:3000/admin/` |
| Production (Render) | `https://morbeez-api.onrender.com/admin/` |

Optional Shopify redirect page: `/pages/admin` → opens the URL above (theme setting **Morbeez API base URL** + `/admin/`).

## First-time setup

### 1. Database migration

```powershell
cd "E:\task\india(kata)"
supabase db push
```

Creates `admin_users` table (`supabase/migrations/20260525000000_admin_users.sql`).

### 2. Environment variables (`backend/.env`)

```env
ADMIN_JWT_SECRET=<openssl rand -hex 32>
SHOPIFY_ADMIN_API_ACCESS_TOKEN=<Admin API token with read/write products>
```

### 3. Create your admin account

```powershell
node scripts/create-admin-user.mjs --email admin@morbeez.in --password "YourSecurePass123" --name "Store Admin"
```

### 4. Run API

```powershell
cd backend
npm run dev
```

Open **http://localhost:3000/admin/** → sign in.

## Roles

| Role | Access |
|------|--------|
| `admin` | Full access |
| `manager` | Edit products & farmers |
| `viewer` | Read-only |

## Features

- **Dashboard** — farmer count, product count
- **Products** — list, search, create, edit (Shopify Admin API)
- **Farmers** — list, search, edit website registrations (Supabase)

## Deploy to Render

Ensure `ADMIN_JWT_SECRET` and `SHOPIFY_ADMIN_API_ACCESS_TOKEN` are set on Render, redeploy the API, then use `https://morbeez-api.onrender.com/admin/`.
