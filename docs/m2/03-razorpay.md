# M2 — Razorpay Integration

## Payment flows

| Flow | Use case | Implementation |
|------|----------|----------------|
| **Shopify Checkout** | Standard D2C | Shopify Payments / Razorpay Shopify app |
| **Payment Links** | Quotations, manual orders | `POST /api/v1/payments/link` |
| **COD** | Rural delivery | Shopify COD + Shiprocket `payment_method: COD` |
| **Webhooks** | Status sync | `POST /webhooks/razorpay` |

## Supported methods (via Razorpay)

- UPI
- Cards
- Net banking
- Wallets
- COD (order-level via Shopify/Shiprocket, not Razorpay capture)

## Service structure

```
services/razorpay/
  razorpay.client.ts    # HTTP + auth
  razorpay.service.ts   # Payment links + webhook handler
```

## Webhook events (subscribe in Razorpay Dashboard)

- `payment.captured`
- `payment.failed`
- `payment_link.paid`
- `order.paid` (if using Razorpay Orders API later)

## Security

- Verify `X-Razorpay-Signature` with `RAZORPAY_WEBHOOK_SECRET`
- Store raw events in `payment_events`
- Idempotency via `webhook_logs`

## Order sync

Payment link `notes.shopify_order_id` → updates `commerce_orders.razorpay_payment_id` on capture.

## Retry strategy

Failed API calls: log + manual retry from admin. M3: outbox worker with exponential backoff.
