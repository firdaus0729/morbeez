# M2 Gap Closure — Implementation Notes

## Newly implemented

| Gap | Implementation |
|-----|----------------|
| Interakt provider | `backend/src/services/whatsapp/providers/interakt.provider.ts` |
| Outbox retry worker | `backend/src/services/events/outbox.worker.ts` — polls every 30s, max 5 retries |
| Fulfillment webhooks | `fulfillments/create`, `fulfillments/update`, `orders/fulfilled` |
| Shopify app proxy | `POST /proxy/leads` + signature verification |
| Dealer form (theme) | `sections/dealer-enquiry-form.liquid` + `assets/dealer-form.js` |
| Integration tests | `backend/tests/*.test.ts` — run `npm test` |
| Pure crypto helpers | `backend/src/lib/shopify-hmac.ts`, `lib/phone.ts` |

## Shopify App Proxy setup

1. Partner Dashboard → App → App setup → App proxy  
   - Subpath prefix: `morbeez`  
   - Proxy URL: `https://YOUR_API/proxy`  

2. Or Custom App → Configuration → App proxy  

3. Create page handle `dealer-enquiry` with template `page.dealer-enquiry`

Storefront form posts to: `/apps/morbeez/leads` → your API `/proxy/leads`

## Run tests

```bash
cd backend
npm test
```

## Env additions

```env
SHOPIFY_APP_CLIENT_SECRET=   # App client secret for proxy HMAC
ENABLE_OUTBOX_WORKER=true
INTERAKT_API_KEY=             # When WHATSAPP_PROVIDER=interakt
```
