# Morbeez — Phase 1 Milestone 2 Master Plan

**Milestone:** Commerce, Payments & WhatsApp Integration  
**Timeline:** 2–3 weeks  
**Stack:** Node.js · TypeScript · Fastify · Supabase · Railway · Shopify · Razorpay · Shiprocket · WhatsApp Cloud API

---

## 1. Executive summary

M2 establishes the **operational layer** between Shopify storefront (M1) and farmer-facing communication. A single **API service** (`backend/`) handles webhooks, syncs orders/payments/shipments, logs WhatsApp conversations, and maintains **farmer profiles + CRM leads** in Supabase.

### Architecture principle

```
Shopify (commerce)  ──webhooks──►  Morbeez API  ◄──webhooks──  Razorpay / Shiprocket / WhatsApp
                                        │
                                        ▼
                                  Supabase (profiles, leads, events)
                                        │
                                        ▼
                              Future: Queue / Zoho / OpenAI (M3+)
```

**Shopify remains checkout source of truth** for catalog and standard orders. Razorpay handles **payment links, UPI, COD reconciliation** where needed outside or alongside Shopify. Shiprocket orchestrates **AWB + Delhivery** last-mile.

---

## 2. Deliverables map

| # | Deliverable | Location |
|---|-------------|----------|
| 1 | Backend architecture | [`01-backend-architecture.md`](01-backend-architecture.md) |
| 2 | Supabase schema | [`02-supabase-schema.md`](02-supabase-schema.md) + [`../../supabase/migrations/`](../../supabase/migrations/) |
| 3 | Razorpay integration | [`03-razorpay.md`](03-razorpay.md) + `backend/src/services/razorpay/` |
| 4 | Shiprocket / Delhivery | [`04-shipping.md`](04-shipping.md) + `backend/src/services/shiprocket/` |
| 5 | WhatsApp architecture | [`05-whatsapp.md`](05-whatsapp.md) + `backend/src/services/whatsapp/` |
| 6 | CRM data structure | [`06-crm-foundation.md`](06-crm-foundation.md) |
| 7 | Webhook strategy | [`07-webhooks.md`](07-webhooks.md) |
| 8 | Railway deployment | [`08-railway-deployment.md`](08-railway-deployment.md) |
| 9 | API folder structure | [`backend/README.md`](../../backend/README.md) |
| 10 | Logging & errors | [`09-logging-errors.md`](09-logging-errors.md) |
| 11 | Future scalability | [`10-future-scalability.md`](10-future-scalability.md) |
| 12 | Automation architecture | [`11-automation.md`](11-automation.md) |
| 13 | Security | [`12-security.md`](12-security.md) |
| 14 | Deployment workflow | [`08-railway-deployment.md`](08-railway-deployment.md) |

---

## 3. M2 success criteria

**Code complete (repo):** see [`M2-GAP-CLOSURE.md`](M2-GAP-CLOSURE.md)

- [ ] API deployed to Railway (staging) with health check — *ops*
- [ ] Supabase migrations applied; RLS policies for service role — *ops*
- [x] Shopify webhooks: orders/create, orders/paid, fulfillments
- [x] Razorpay webhooks verified; payment events stored
- [x] Shiprocket: shipment create on order paid; tracking webhooks
- [x] WhatsApp: inbound webhook → farmer upsert → interaction log (+ Interakt provider)
- [x] Lead/callback/quotation APIs + Shopify app proxy `/proxy/leads`
- [x] Farmer profile CRUD linked to Shopify customer ID
- [x] Structured logging + webhook idempotency + outbox retry worker
- [x] Documentation + `.env.example` complete
- [x] Theme dealer enquiry form → app proxy
- [x] Unit tests (`npm test` in `backend/`)

---

## 4. Implementation roadmap (2–3 weeks)

### Week 1 — Foundation
| Day | Focus |
|-----|-------|
| D1 | Supabase schema, Railway project, API scaffold |
| D2 | Shopify webhook handlers + order sync |
| D3 | Farmer profile + lead APIs |
| D4 | Razorpay service + webhooks |
| D5 | Integration tests + staging deploy |

### Week 2 — Shipping & WhatsApp
| Day | Focus |
|-----|-------|
| D6 | Shiprocket shipment creation flow |
| D7 | Shiprocket tracking webhooks |
| D8 | WhatsApp Cloud API + webhook |
| D9 | WATI adapter stub + message templates |
| D10 | CRM lead workflows + admin queries |

### Week 3 — Hardening
| Day | Focus |
|-----|-------|
| D11 | Rate limiting, validation, error handling |
| D12 | Quotation inquiry + COD flows |
| D13 | Event outbox + retry jobs |
| D14 | Security review + logging |
| D15 | Production config + handoff doc |

---

## 5. Task breakdown (P0 / P1)

### P0
1. `backend/` Fastify app + config validation  
2. Supabase migrations (farmers, leads, events)  
3. Shopify HMAC webhooks  
4. Razorpay webhook + payment link API  
5. Shiprocket create shipment + tracking webhook  
6. WhatsApp inbound webhook + farmer upsert  
7. Railway deploy + env docs  

### P1
8. WATI provider adapter  
9. Quotation inquiry workflow  
10. Abandoned cart event stub  
11. Zoho sync outbox table  

### P2 (M3)
12. OpenAI / vision pipelines  
13. Telecaller dashboard  

---

## 6. Commerce operations (Shopify Admin)

M2 **configures** (documented in [`13-commerce-operations.md`](13-commerce-operations.md)):

- Variant matrix (pack sizes), tags for crop/problem  
- Combo collections, quantity rules via Shopify  
- **Dealer pricing**: customer tags + draft price lists (Plus/B2B) — schema ready  
- **Quotation inquiries**: API + Supabase, not checkout  
- Search & Discovery filters aligned with M1 metafields  

---

## 7. Out of scope (M2)

- AI Crop Doctor / GPT-4o / Plant.id  
- Full Zoho CRM bi-directional sync  
- Mobile apps  
- WhatsApp broadcast campaigns at scale  

Hooks and tables are **reserved** for M3.
