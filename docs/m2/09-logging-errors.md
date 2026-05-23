# M2 — Logging & Error Handling

## Logging (Pino)

- Structured JSON in production
- Pretty print in development
- Redact: `authorization`, `x-api-key`

```typescript
logger.info({ orderId, farmerId }, 'Order paid processed');
logger.error({ err, webhookId }, 'Webhook failed');
```

## Error taxonomy

| Class | HTTP | Code |
|-------|------|------|
| `ValidationError` | 400 | VALIDATION_ERROR |
| `UnauthorizedError` | 401 | UNAUTHORIZED |
| `NotFoundError` | 404 | NOT_FOUND |
| `WebhookVerificationError` | 401 | WEBHOOK_VERIFICATION_FAILED |
| `AppError` | varies | custom |

## Global handler

Fastify `setErrorHandler` returns `{ error, message }` — never stack traces in production.

## Correlation (M3)

Add `x-request-id` middleware and propagate to logs + outbox.
