# M3 — Security Architecture

## API keys

- `OPENAI_API_KEY`, `PLANT_ID_API_KEY` — server only (Railway env)
- Advisory routes require `x-api-key` (`INTERNAL_API_KEY`)
- App proxy routes verify Shopify HMAC signature

## Upload validation

- Images ≤ 5MB, `image/*` only
- Audio ≤ 10MB for voice endpoint

## Rate limiting

Global Fastify rate limit applies; consider stricter limits on `/api/v1/advisory/*` in production.

## Logging

- `ai_request_logs` — provider, latency, success (no raw images)
- Pino structured logs; never log API keys or base64 payloads

## AI disclaimer

All API responses include disclaimer text; theme shows disclaimer on form.
