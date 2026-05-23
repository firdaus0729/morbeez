# M2 — Shiprocket & Delhivery

## Architecture

**Shiprocket is the single shipping integration.** Delhivery (and other couriers) are assigned via Shiprocket's courier priority rules — no separate Delhivery API in M2.

```
Order paid (Shopify webhook)
    → event: shopify.order.paid
    → shiprocketService.createShipmentForShopifyOrder()
    → AWB generated
    → shipment_events row
    → tracking webhooks → status updates
```

## Rural logistics considerations

- COD flag from Shopify `financial_status` / payment gateway
- Pincode serviceability checked in Shiprocket dashboard rules
- Weight/dimensions defaults in code — **override per product metafield in M3**

## Webhook

`POST /webhooks/tracking` — configure this URL in Shiprocket settings.

**Important:** Shiprocket rejects URLs containing `shiprocket`, `sr`, or `kr`. Do **not** use `/webhooks/shiprocket` in their dashboard.

Auth: set token type to `x-api-key` in Shiprocket; same value as `SHIPROCKET_WEBHOOK_TOKEN` in Railway/env.
Also accepted: `x-shiprocket-token`, `Authorization: Bearer <token>`.

## Multi-courier future

Shiprocket supports courier selection API. M3: rules engine based on state/district/COD.

## Failure handling

- Shipment create failure → logged, `event_outbox` for retry
- Do not block Shopify webhook response (async via event bus)
