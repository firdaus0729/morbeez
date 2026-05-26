# M3 — WhatsApp + OpenAI inbound pipeline

End-to-end flow for farmer WhatsApp messages through lead capture, language detection, cost controls, FAQ cache, and Crop Doctor (OpenAI + optional Plant.id).

## Enable

```env
ENABLE_AI_CROP_DOCTOR=true
WHATSAPP_PROVIDER=adsgyani   # or cloud for Meta media IDs
```

Run migration: `supabase/migrations/20260601000000_whatsapp_ai_pipeline.sql`

## Pipeline steps (in order)

1. **Lead capture** — upsert farmer, attribution (`campaign_source`, `referral_source`), deduped daily lead row
2. **Language detection** — Unicode script heuristics (ml/ta/kn/hi/en); Whisper transcript refines voice
3. **Interaction log** — `interaction_logs` insert
4. **Agriculture guard** — block obvious off-topic / spam (media always allowed)
5. **FAQ cache** — `advisory_faq_cache` keyword match → reply without OpenAI
6. **AI usage control** — per-farmer daily limits + min interval (`farmer_ai_usage_daily`)
7. **Route** — voice → Whisper → diagnose; image → quality + duplicate check → diagnose; text → FAQ or diagnose
8. **Compact context** — crop, stage, last 3 issues only (no full chat history)
9. **Crop Doctor** — OpenAI vision/text, safety validation, escalation
10. **Telecaller task** — on `advisory.escalated` event → `crm_tasks` + high-priority lead if urgent

## Webhook URLs

| Provider | URL |
|----------|-----|
| Ads Gyani | `POST /webhooks/whatsapp/adsgyani` |
| Meta Cloud | `POST /webhooks/whatsapp` |

## Quota env vars

See `backend/.env.example` — `AI_DAILY_*_LIMIT_FREE/PREMIUM`, `AI_MAX_VOICE_DURATION_SEC`, `AI_MIN_REQUEST_INTERVAL_SEC`.

Mark premium farmers: `farmers.metadata.premium = true`.

## FAQ management

Insert rows into `advisory_faq_cache` with `keywords` text array and localized `response_*` columns.

## Code entrypoint

`backend/src/services/whatsapp/pipeline/whatsapp-inbound.pipeline.ts`

## Template first contact

Set approved template name in `.env`:

```env
WHATSAPP_WELCOME_TEMPLATE=your_welcome_template_name
WHATSAPP_OUTBOUND_TEMPLATE=your_agent_outbound_template_name
```

- **Welcome template** — sent once on a farmer’s first WhatsApp message (Ads Gyani `send-template-message`).
- **Outbound template** — used when telecaller sends a message outside the 24h session window.

## Shopify product links

Replies include clickable product URLs when recommendations have `shopify_product_handle`:

```env
SHOPIFY_STOREFRONT_URL=https://morbeez.in
```

## Agronomist escalations UI

Admin → **AI Advisory → Escalations** (`#telecaller/escalations`)

API: `GET/PATCH /console/api/v1/escalations`
