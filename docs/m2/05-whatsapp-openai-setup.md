# WhatsApp + OpenAI auto-reply setup

When a farmer messages your Meta WhatsApp business number, the API should **automatically reply** using OpenAI.

## Flow

1. Farmer taps **WhatsApp** on the site → opens chat with `+91 76760 26318`
2. Farmer sends text / photo / voice
3. Meta sends webhook → `POST https://morbeez-api.onrender.com/webhooks/whatsapp`
4. Backend runs inbound pipeline → OpenAI → `sendText` back via Cloud API

## Render env (required)

```env
WHATSAPP_PROVIDER=cloud
WHATSAPP_PHONE_NUMBER_ID=<from Meta WhatsApp → API setup>
WHATSAPP_ACCESS_TOKEN=<permanent token from Meta>
WHATSAPP_APP_SECRET=<Meta app secret>
WHATSAPP_VERIFY_TOKEN=<same as Meta webhook verify token>

OPENAI_API_KEY=sk-...
ENABLE_WHATSAPP_OPENAI_REPLY=true
ENABLE_AI_CROP_DOCTOR=true
```

Redeploy after changes.

## Meta Developer Console

1. **WhatsApp → Configuration → Webhook**
   - Callback URL: `https://morbeez-api.onrender.com/webhooks/whatsapp`
   - Verify token: matches `WHATSAPP_VERIFY_TOKEN`
   - Subscribe to: **messages** (required)

2. **WhatsApp → API setup** — confirm phone number is connected

3. Test webhook: `GET https://morbeez-api.onrender.com/health/whatsapp-meta`

## Reply behaviour

| Farmer sends | Backend reply |
|--------------|----------------|
| Hello, Hi Morbeez, need help | OpenAI conversational reply |
| Long symptom description (25+ chars, crop keywords) | Full Crop Doctor AI diagnosis |
| Crop photo | Vision + Crop Doctor |
| Voice note | Whisper + Crop Doctor |

## Troubleshooting “no reply”

| Check | Fix |
|-------|-----|
| Webhook not subscribed | Meta → subscribe **messages** |
| Wrong verify token | Match Meta and Render exactly |
| `ENABLE_AI_CROP_DOCTOR=false` and no OpenAI key | Set `OPENAI_API_KEY` and `ENABLE_WHATSAPP_OPENAI_REPLY=true` |
| Invalid access token | Regenerate token in Meta, update Render |
| Render logs show `WhatsApp outbound failed` | Check token + `WHATSAPP_PHONE_NUMBER_ID` |
| Farmer outside 24h window | Farmer must message you first (they did) — then free-text works |

Check Render logs for:
- `WhatsApp Cloud inbound message`
- `WhatsApp outbound sent` or `WhatsApp outbound failed`
