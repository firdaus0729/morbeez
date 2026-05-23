# M2 — Webhook Strategy

## Principles

1. **Verify signature** before parsing
2. **Idempotency** via `webhook_logs (provider, idempotency_key)` unique
3. **Fast 200 response** — heavy work in services, not blocking retries
4. **Log everything** for audit

## Idempotency keys

| Provider | Key source |
|----------|------------|
| Shopify | `X-Shopify-Webhook-Id` |
| Razorpay | `event + payment_id` |
| WhatsApp | Hash of entry payload |
| Shiprocket | `awb` or `shipment_id` |

## Registration checklist

### Shopify (Admin → Notifications)

- `orders/create`
- `orders/paid`
- `orders/updated` (optional)
- URL: `https://api.morbeez.in/webhooks/shopify`

### Razorpay

- URL: `https://api.morbeez.in/webhooks/razorpay`
- Secret → `RAZORPAY_WEBHOOK_SECRET`

### WhatsApp

- URL: `https://api.morbeez.in/webhooks/whatsapp`

### Shiprocket

- Tracking webhook URL in panel

## Retry handling

Providers retry on non-2xx. Duplicate deliveries handled by idempotency check — return `200 { duplicate: true }`.

Failed processing: log `status: failed`, alert via Railway logs. M3: dead-letter queue.
