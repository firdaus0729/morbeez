# M2 — Automation Architecture

## Event-driven core

```typescript
eventBus.publish('shopify.order.paid', payload, 'shopify');
// → persist event_outbox
// → run registered handlers
```

## M2 handlers

| Event | Reaction |
|-------|----------|
| `shopify.order.paid` | Create Shiprocket shipment |
| `whatsapp.message.received` | Optional welcome template |
| `quotation.requested` | Log for telecaller |
| `lead.created` | Log (M3: notify Slack) |

## M3 automations (planned)

| Workflow | Trigger |
|----------|---------|
| Abandoned cart | Shopify checkout webhook |
| Seasonal reminder | Cron + farmer_crops.season |
| WhatsApp campaign | Segment query → WATI broadcast |
| AI recommendation | `ai_advisory_logs` complete |
| Zoho sync | `crm_sync_queue` worker |

## Queue migration path

Replace `eventBus.publish` persistence with:

```typescript
await queue.add(event.type, event.payload, { jobId: event.idempotencyKey });
```

Handlers unchanged.
