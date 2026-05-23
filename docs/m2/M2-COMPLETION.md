# M2 Completion Status

**Last updated:** 2026-05-23

## Summary

| Area | Status |
|------|--------|
| Backend API (code) | **~95%** — typecheck + tests pass |
| Supabase schema (migration file) | **100%** — apply in project |
| Theme integration (dealer form) | **Done** |
| Live ops (Railway, webhooks, UAT) | **0%** — manual setup required |

## Implemented in this milestone

- Fastify API with Shopify, Razorpay, Shiprocket, WhatsApp webhooks
- Farmer + lead REST APIs (API key auth)
- Event bus + `event_outbox` + background retry worker
- Interakt WhatsApp provider (alongside Cloud API + WATI)
- Shopify fulfillment webhooks
- Shopify App Proxy: `POST /proxy/leads`
- Theme: `dealer-enquiry-form` section + `page.dealer-enquiry` template
- Tests: HMAC verification, Indian phone normalization

## Your next steps (ops)

1. `supabase db push` or run `supabase/migrations/20260523000000_m2_foundation.sql`
2. Deploy `backend/` to Railway — see [`08-railway-deployment.md`](08-railway-deployment.md)
3. Copy `backend/.env.example` → Railway variables
4. Register webhooks per [`07-webhooks.md`](07-webhooks.md)
5. Configure Shopify App Proxy: subpath `morbeez` → `https://<api>/proxy`
6. Create Shopify page **Dealer enquiry** with handle `dealer-enquiry`, template `page.dealer-enquiry`
7. UAT per [`M2-STORE-SETUP.md`](M2-STORE-SETUP.md)

## Out of scope (M2)

- Telecaller dashboard UI
- Zoho CRM sync worker (queue table exists)
- OpenAI / Plant.id
- Mobile apps
