# M2 Store & Integration Setup

## 1. Supabase

```bash
supabase link --project-ref YOUR_REF
supabase db push
```

## 2. Railway

1. Deploy `backend/` service
2. Copy all env from `.env.example`
3. Set `API_BASE_URL` to Railway URL

## 3. Shopify webhooks

Admin → Settings → Notifications → Webhooks:

- `https://YOUR_API/webhooks/shopify`
- Topics: orders/create, orders/paid

Secret = `SHOPIFY_WEBHOOK_SECRET` from app or custom app.

## 4. Razorpay

1. Dashboard → Webhooks → add URL `/webhooks/razorpay`
2. Copy webhook secret to env
3. Enable UPI, cards, netbanking

## 5. Shiprocket

1. API user for `SHIPROCKET_EMAIL` / `PASSWORD`
2. Configure pickup location `Primary`
3. Enable Delhivery in courier priority
4. Tracking webhook → `/webhooks/shiprocket`

## 6. WhatsApp

1. Meta Business → WhatsApp → Configuration
2. Callback: `/webhooks/whatsapp`
3. Verify token matches env
4. Create template `welcome_farmer` (optional)

## 7. Test flows

```bash
# Health
curl https://YOUR_API/health

# Create lead
curl -X POST https://YOUR_API/api/v1/leads \
  -H "x-api-key: YOUR_KEY" \
  -H "Content-Type: application/json" \
  -d '{"phone":"919876543210","intent":"quotation","source":"web","cropType":"Paddy"}'
```

## 8. Theme integration (optional M2.1)

Dealer form → `POST /api/v1/leads` via Shopify app proxy `/apps/morbeez/leads`.
