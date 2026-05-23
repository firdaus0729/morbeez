# M2 — Security Strategy

## Secrets

- All secrets in Railway env (never in repo)
- `.env.example` without real values
- Rotate: Shopify token, Razorpay, WhatsApp, internal API key quarterly

## Webhook security

| Provider | Method |
|----------|--------|
| Shopify | HMAC-SHA256 base64 |
| Razorpay | HMAC-SHA256 hex |
| WhatsApp | X-Hub-Signature-256 |
| Shiprocket | Shared token header |
| Internal API | `x-api-key` |

## API hardening

- `@fastify/helmet`
- `@fastify/rate-limit` (100/min default)
- Zod input validation on REST routes
- CORS restricted in production

## Supabase

- Service role key **server only**
- RLS enabled; policies for service role
- No anon key in API service

## Compliance (India)

- Farmer phone = PII — encrypt at rest (Supabase default)
- WhatsApp opt-in: `farmers.metadata.whatsapp_opt_in` (M2.1)
- Payment data stays in Razorpay (PCI scope minimized)
