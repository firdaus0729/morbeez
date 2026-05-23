# Morbeez — Agriculture Commerce & Advisory Platform

**Phase 1 · M1** — Shopify foundation & theme  
**Phase 1 · M2** — Commerce ops, payments, WhatsApp, CRM backend

## Repository layout

| Path | Purpose |
|------|---------|
| [`docs/`](docs/) | M1 + M2 architecture & setup guides |
| [`docs/m2/`](docs/m2/) | Milestone 2 specifications |
| [`theme/`](theme/) | Shopify Online Store 2.0 theme (Liquid) |
| [`backend/`](backend/) | Node.js API — webhooks, payments, WhatsApp, CRM |
| [`supabase/migrations/`](supabase/migrations/) | PostgreSQL schema |
| [`.shopify/`](.shopify/) | CLI project config (link to store) |

## Quick start (after Shopify store exists)

```bash
npm install -g @shopify/cli @shopify/theme
cd theme
shopify theme dev --store YOUR_STORE.myshopify.com
```

## Milestone 1 scope

**In scope:** Theme architecture, homepage sections, collection taxonomy, metafield planning, multilingual foundation, SEO/performance patterns, admin-friendly sections.

**M1 code status:** ✅ Complete — see [`docs/M1-COMPLETION.md`](docs/M1-COMPLETION.md)

**Store setup:** Run `npm run setup:m1` then [`docs/M1-STORE-SETUP.md`](docs/M1-STORE-SETUP.md)

**Out of scope (M1):** AI diagnosis, OpenAI, WhatsApp backend, CRM, payments, shipping APIs.

## Milestone 2 — quick start

```bash
cd backend
cp .env.example .env
npm install
npm run dev
```

Docs: [`docs/m2/PHASE1-M2-MASTER-PLAN.md`](docs/m2/PHASE1-M2-MASTER-PLAN.md) · Setup: [`docs/m2/M2-STORE-SETUP.md`](docs/m2/M2-STORE-SETUP.md)

## Documentation index

### M2
- [M2 Master plan](docs/m2/PHASE1-M2-MASTER-PLAN.md)
- [Backend architecture](docs/m2/01-backend-architecture.md)
- [Supabase schema](docs/m2/02-supabase-schema.md)
- [Razorpay](docs/m2/03-razorpay.md) · [Shipping](docs/m2/04-shipping.md) · [WhatsApp](docs/m2/05-whatsapp.md)
- [CRM](docs/m2/06-crm-foundation.md) · [Webhooks](docs/m2/07-webhooks.md) · [Railway](docs/m2/08-railway-deployment.md)
- [Security](docs/m2/12-security.md) · [Automation](docs/m2/11-automation.md)

### M1

0. [M1 store setup checklist](docs/M1-STORE-SETUP.md) — **start here after theme dev**
1. [Master plan & deliverables](docs/PHASE1-M1-MASTER-PLAN.md)
2. [Theme architecture & folder structure](docs/01-theme-architecture.md)
3. [Homepage & component breakdown](docs/02-homepage-sections.md)
4. [Collection & product taxonomy](docs/03-collection-architecture.md)
5. [Metafield definitions](docs/04-metafields.md)
6. [Multilingual foundation](docs/05-multilingual.md)
7. [SEO & performance](docs/06-seo-performance.md)
8. [Admin, apps & customization](docs/07-admin-apps.md)
9. [Future scalability & API readiness](docs/08-future-scalability.md)
10. [Roadmap, tasks & Git workflow](docs/09-roadmap-workflow.md)
