# M2 — WhatsApp Architecture

## Provider abstraction

```typescript
interface WhatsAppProvider {
  sendText(to: string, text: string): Promise<void>;
  sendTemplate(to: string, name: string, params: { body: string[] }): Promise<void>;
}
```

| Provider | Env | Use |
|----------|-----|-----|
| `cloud` | Meta Cloud API | **Callback** `GET/POST /webhooks/whatsapp` |
| `adsgyani` | Ads Gyani (`adsgyani.in`) | Webhook `/webhooks/whatsapp/adsgyani` |
| `wati` | WATI API | Alternative BSP |
| `interakt` | Interakt API | Alternative BSP |

Set `WHATSAPP_PROVIDER=adsgyani` and fill `ADS_GYANI_*` vars (see `.env.example`).

**Full inbound AI pipeline (M3):** see [06-whatsapp-ai-pipeline.md](../m3/06-whatsapp-ai-pipeline.md) — lead capture, language detection, FAQ cache, quotas, Crop Doctor routing.

### Ads Gyani setup

1. **Settings → API & Webhook**: copy **API Base URL** (`https://adsgyani.in/api`), **Vendor UID** (UUID), **API Access Token**
2. Set `ADS_GYANI_TENANT` to the Vendor UID (not your business name)
3. Outbound: `POST /{vendorUid}/contact/send-message` with `phone_number` + `message_body` ([api-docs.pdf](https://adsgyani.in/api-docs.pdf))
4. Webhook callback: `https://<api>/webhooks/whatsapp/adsgyani` — enable in dashboard
5. Verify token: `ADS_GYANI_WEBHOOK_VERIFY_TOKEN` (if Ads Gyani asks for one on setup)
6. Optional: `ADS_GYANI_WEBHOOK_SECRET` if they sign inbound requests
7. Phone format: `919876543210` (numeric, country code, no `+` or leading `0`)

## Inbound flow

```
Farmer message → Meta webhook → verify signature
  → upsert farmer by phone
  → interaction_logs insert
  → intent classification (quote/callback/support)
  → lead create if matched
  → event: whatsapp.message.received
  → optional auto-reply template
```

## Farmer capabilities (M2)

| Action | How |
|--------|-----|
| Initiate conversation | Message business number |
| Inquiry | Logged + lead `general` |
| Callback | Keyword "call" → lead `callback` |
| Quotation | Keyword "quote" → `quotation_inquiries` |
| Support | Keyword "help" → lead `support` |

## M3 preparation

- Image uploads → `message.type === 'image'` stored in Supabase Storage
- Voice notes → Whisper API pipeline
- Multilingual replies → `preferred_language` + template locale
- Telecaller escalation → `leads.priority = urgent`

## Webhook setup (Meta Cloud API — `WHATSAPP_PROVIDER=cloud`)

1. Meta Developer App → **WhatsApp** → **Configuration**
2. **Callback URL:** `https://morbeez-api.onrender.com/webhooks/whatsapp` (your API host + `/webhooks/whatsapp`)
3. **Verify token:** invent a secret string (e.g. `morbeez_whatsapp_verify_8f3k2`)
4. Set **the same string** on Render: `WHATSAPP_VERIFY_TOKEN=morbeez_whatsapp_verify_8f3k2`
5. Click **Verify and save** (Meta sends `GET ?hub.mode=subscribe&hub.verify_token=...&hub.challenge=...`)
6. Render env also needs: `WHATSAPP_PROVIDER=cloud`, `WHATSAPP_PHONE_NUMBER_ID`, `WHATSAPP_ACCESS_TOKEN`, `WHATSAPP_APP_SECRET`
7. Subscribe webhook field: **messages**

**If verification fails:** open `https://<api>/health/whatsapp-meta` — `verifyTokenConfigured` must be `true`. Test manually:

```text
GET https://<api>/webhooks/whatsapp?hub.mode=subscribe&hub.verify_token=YOUR_TOKEN&hub.challenge=12345
```

Response body must be exactly `12345` (plain text), not JSON.

**Common mistake:** Verify token in Meta ≠ `WHATSAPP_VERIFY_TOKEN` on Render, or token not set on Render at all.
