# M3 Store & Integration Setup

## 1. Supabase

```bash
supabase db push
# or apply supabase/migrations/20260523100000_m3_ai_advisory.sql
```

## 2. Environment (Railway)

```env
OPENAI_API_KEY=sk-...
PLANT_ID_API_KEY=...
ENABLE_AI_CROP_DOCTOR=true
ENABLE_ADVISORY_FOLLOW_UPS=true
ENABLE_ADVISORY_AUTOMATION=true
```

## 3. Shopify

1. Page handle: `crop-doctor` → template `page.crop-doctor`
2. App proxy path: `/apps/morbeez/advisory/diagnose` → API `/proxy/advisory/diagnose`
3. Homepage CTA → link to `/pages/crop-doctor`
4. Create products matching handles in `backend/config/recommendations/ginger.json`

## 4. WhatsApp

1. Enable Crop Doctor after API UAT
2. Send test image to business number
3. Send Malayalam voice note

## 5. API test

```bash
curl -X POST https://YOUR_API/api/v1/advisory/diagnose \
  -H "x-api-key: YOUR_KEY" \
  -H "Content-Type: application/json" \
  -d '{"phone":"919876543210","cropType":"ginger","language":"en","symptomsText":"yellow leaves"}'
```

## 6. Agronomist process

1. Query pending escalations in Supabase
2. Contact farmer via telecaller
3. Update `agronomist_escalations.status` + `agronomist_notes`
