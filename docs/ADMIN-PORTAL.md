# Morbeez Operations Console

Enterprise-style **agriculture commerce control center** — products, farmers, orders, and extended product intelligence (agri + AI + SEO). Served as a static SPA from the Fastify API at `/morbeez-staff/`.

> **Do not use `/admin` in the URL.** Shopify redirects paths containing “admin” to Shopify Admin. Use **`/morbeez-staff`**.

## URLs

| Environment | Console |
|-------------|---------|
| Production | **https://morbeez-api.onrender.com/morbeez-staff/** |
| Local | `http://localhost:10000/morbeez-staff/` |

## Modules

| Module | Status | Description |
|--------|--------|-------------|
| **Dashboard** | Live | KPIs, recent orders/farmers, low stock, roadmap |
| **Products** | Live | Full Shopify catalog, pagination, images |
| **Product intelligence** | Live | Tabs: Basic, Agriculture, AI mapping, SEO, Cross-sell (Supabase) |
| **Low stock** | Live | Products with ≤10 units |
| **Orders** | Live | Razorpay checkout sessions + Shopify `commerce_orders` |
| **Farmer CRM** | Live | Search, edit profiles |
| **Staff** | Live | List admin users (admin role only) |
| **Settings** | Live | Integrations overview |
| Offers, Combos, Flash sales | Planned | UI placeholders |
| AI advisory rules | Planned | Symptom/crop logic panel |
| WhatsApp campaigns | Planned | Uses existing backend webhooks |
| Content CMS, Analytics | Planned | |

## Setup

### 1. Migrations

```powershell
supabase db push
```

Includes: `admin_users`, `checkout_sessions`, `product_intelligence`.

### 2. Environment

```env
ADMIN_JWT_SECRET=<openssl rand -hex 32>
SHOPIFY_ADMIN_API_ACCESS_TOKEN=<write_products, read_products, write_orders>
```

### 3. Staff account

```powershell
npm run admin:create-user -- --email admin@morbeez.in --password "YourSecurePass123" --name "Store Admin" --role admin
```

### 4. Run locally

```powershell
cd backend && npm run dev
```

Open **http://localhost:10000/morbeez-staff/**

## Product import / intelligence columns

Extended fields from your master import sheet are stored in **`product_intelligence`** (JSONB per section), edited under **Edit product** tabs:

- **Basic** — HSN, GST, barcode, manufacturer, short description  
- **Agriculture** — active ingredient, pests, crops, dose, PHI, compatibility  
- **AI mapping** — symptoms, keywords, severity, SPAD, weather, priority  
- **SEO & content** — meta, benefits, usage/safety copy  
- **Cross-sell** — tank mix, combos, rotation, adjuvants  

Shopify fields (title, price, SKU, tags, HTML description, images) remain on the **Shopify & pricing** tab.

Future: CSV import script → `product_intelligence` + Shopify Admin API.

## API (staff JWT)

| Method | Path |
|--------|------|
| POST | `/morbeez-staff/api/v1/auth/login` |
| GET | `/morbeez-staff/api/v1/auth/me` |
| GET | `/morbeez-staff/api/v1/dashboard` |
| GET | `/morbeez-staff/api/v1/stats` |
| GET/POST/PUT | `/morbeez-staff/api/v1/products` … |
| GET/PUT | `/morbeez-staff/api/v1/products/:id/intelligence` |
| GET | `/morbeez-staff/api/v1/orders` |
| GET/PATCH | `/morbeez-staff/api/v1/farmers` … |
| GET | `/morbeez-staff/api/v1/staff` (admin only) |

## Roles

| Role | Access |
|------|--------|
| `admin` | Full + staff list |
| `manager` | Products, farmers, orders, intelligence |
| `viewer` | Read-only (enforce in API — coming soon) |

## Frontend stack (unchanged)

- Static HTML + **ES modules** (`admin/js/app.js`)
- CSS (`admin/css/admin.css`)
- No Next.js — same deployment as API static files

## Deploy

Redeploy Render after backend + migration updates. Console assets live in repo `admin/` folder.
