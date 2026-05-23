# M2 — CRM Foundation

## Lightweight CRM (no full Zoho in M2)

| Entity | Purpose |
|--------|---------|
| `leads` | All inbound intents |
| `quotation_inquiries` | Quote pipeline |
| `callback_requests` | Telecaller queue |
| `interaction_logs` | Full comms history |
| `crm_sync_queue` | Zoho outbound (M3) |

## Lead lifecycle

```
new → contacted → qualified → won | lost
```

## Intent types

- `quotation` — price / bulk order
- `callback` — phone follow-up
- `support` — agronomy help (→ M3 AI)
- `dealer` — B2B partnership
- `general` — catch-all

## Telecaller-ready fields

- `priority` (normal / high / urgent)
- `assigned_to` (email or agent ID)
- `follow_up_at`
- `notes`

## Lead sources

`whatsapp` | `web` | `shopify` | `phone`

Web form: Shopify Form → app proxy or direct API `POST /api/v1/leads` from theme JS (M2.1).

## Zoho CRM (M3)

`crm_sync_queue` stores payloads. Worker maps:

- Lead → Zoho Lead module
- Farmer → Zoho Contact
- Order → Zoho Deal
