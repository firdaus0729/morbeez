# Morbeez Staff Console

Staff portal for managing **Shopify products** and **registered farmers** — separate from the public storefront and farmer login.

> **Do not use `/admin` in the URL.** Shopify redirects store owners from paths containing “admin” to [admin.shopify.com](https://admin.shopify.com). Use **`/console`** instead.

## URLs

| Environment | Staff console URL |
|-------------|-------------------|
| Production (Render) | **https://morbeez-api.onrender.com/console/** |
| Local API | `http://localhost:10000/console/` |

### Professional options (recommended later)

| Style | Example | Notes |
|-------|---------|--------|
| **Path (current)** | `morbeez-api.onrender.com/console/` | Works now after deploy |
| **Subdomain** | `console.morbeez.in` | Point CNAME to Render; best for staff bookmarks |
| **Short path** | `…/staff` or `…/manage` | Alternative if you prefer different wording |

Optional Shopify page: handle `staff-console` with template `page.console` → redirects to API `/console/`.

## First-time setup

### 1. Database migration

```powershell
supabase db push
```

### 2. Environment (`backend/.env` + Render)

```env
ADMIN_JWT_SECRET=<openssl rand -hex 32>
SHOPIFY_ADMIN_API_ACCESS_TOKEN=<Admin API token with product read/write>
```

### 3. Create staff account

```powershell
npm run admin:create-user -- --email admin@morbeez.in --password "YourSecurePass123" --name "Store Admin"
```

### 4. Run API & sign in

```powershell
cd backend
npm run dev
```

Open **http://localhost:10000/console/**

## Roles

| Role | Access |
|------|--------|
| `admin` | Full access |
| `manager` | Edit products & farmers |
| `viewer` | Read-only |

## Deploy

Redeploy Render, then use **https://morbeez-api.onrender.com/console/**

Legacy `/admin` and `/admin/` redirect to `/console/` on the API server.
