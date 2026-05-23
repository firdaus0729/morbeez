# M2 — Supabase Schema Design

Migration: [`supabase/migrations/20260523000000_m2_foundation.sql`](../../supabase/migrations/20260523000000_m2_foundation.sql)

## ER diagram (core)

```mermaid
erDiagram
  farmers ||--o{ farmer_crops : has
  farmers ||--o{ leads : generates
  farmers ||--o{ interaction_logs : has
  farmers ||--o{ quotation_inquiries : requests
  leads ||--o| quotation_inquiries : may_create
  leads ||--o| callback_requests : may_create
  farmers ||--o{ commerce_orders : places
  commerce_orders ||--o{ shipment_events : ships
  commerce_orders ||--o{ payment_events : pays

  farmers {
    uuid id PK
    text phone UK
    text shopify_customer_id UK
    text preferred_language
    text district
  }

  farmer_crops {
    uuid id PK
    uuid farmer_id FK
    text crop_type
    decimal acreage
    text stage
  }

  leads {
    uuid id PK
    uuid farmer_id FK
    text intent
    text status
    text priority
  }

  interaction_logs {
    uuid id PK
    uuid farmer_id FK
    text channel
    text direction
  }

  event_outbox {
    uuid id PK
    text event_type
    jsonb payload
    text status
  }
```

## Table purposes

| Table | Purpose |
|-------|---------|
| `farmers` | Master farmer identity (phone unique) |
| `farmer_crops` | Crop portfolio per farmer |
| `leads` | CRM leads with intent + telecaller status |
| `quotation_inquiries` | B2B/quote workflow before checkout |
| `callback_requests` | Scheduled callback queue |
| `commerce_orders` | Shopify order mirror |
| `payment_events` | Razorpay audit trail |
| `shipment_events` | AWB + tracking history |
| `interaction_logs` | WhatsApp/SMS/web history |
| `webhook_logs` | Idempotency + debug |
| `event_outbox` | Automation queue (M3) |
| `crm_sync_queue` | Zoho outbound (M3) |

## Future tables (M3 — not migrated yet)

- `disease_history`
- `yield_history`
- `ai_advisory_logs`
- `recommendation_history`

Columns reserved in `farmers.metadata` JSONB until normalized.

## Indexes strategy

- Phone lookup (WhatsApp inbound)
- Lead status (telecaller dashboard)
- Webhook idempotency unique constraint
- Outbox `status + created_at` for worker poll

## RLS

M2: **service role only** from API. M3: farmer-facing app uses anon key + policies on own `farmer_id`.
