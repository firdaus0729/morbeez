# M2 — Backend Architecture

## System context

```mermaid
flowchart TB
  subgraph clients [Clients]
    SF[Shopify Storefront]
    WA[WhatsApp Farmers]
    TC[Telecaller / Admin]
  end

  subgraph morbeez_api [Morbeez API - Railway]
    WH[Webhook Layer]
    API[REST API v1]
    EB[Event Bus + Outbox]
    SVC[Service Layer]
  end

  subgraph external [External Services]
    SH[Shopify Admin]
    RZ[Razorpay]
    SR[Shiprocket / Delhivery]
    META[WhatsApp Cloud API]
  end

  subgraph data [Data]
    SB[(Supabase PostgreSQL)]
  end

  SF --> SH
  SH -->|webhooks| WH
  WA --> META --> WH
  TC --> API
  WH --> SVC
  API --> SVC
  SVC --> EB
  SVC --> SB
  SVC --> RZ
  SVC --> SR
  SVC --> META
```

## Layer responsibilities

| Layer | Responsibility |
|-------|----------------|
| **Routes** | HTTP, validation, auth, raw body for webhooks |
| **Services** | Business logic, external API calls |
| **Events** | Side effects, async-ready outbox |
| **Lib** | Supabase client, logger, typed errors |

## Design decisions

1. **Single deployable** — one Fastify service on Railway (not microservices yet).
2. **Shopify = catalog + standard checkout** — API syncs orders, does not replace checkout.
3. **Razorpay** — payment links, COD reconciliation, B2B quotations.
4. **Shiprocket** — single integration; Delhivery via SR courier rules.
5. **WhatsApp** — provider interface (`cloud` | `wati` | `interakt`).
6. **Supabase** — source of truth for farmers, leads, interaction history.

## Service modules

```
services/
  shopify/     → Admin API + order webhooks
  razorpay/    → Payment links + payment webhooks
  shiprocket/  → Shipment create + tracking webhooks
  whatsapp/    → Inbound/outbound + intent classification
  farmer/      → Profile CRUD
  crm/         → Leads, quotations, callbacks
```

## API versioning

Prefix: `/api/v1/`. Breaking changes → v2 with parallel run period.
