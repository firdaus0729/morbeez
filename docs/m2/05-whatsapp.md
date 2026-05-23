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
| `cloud` | Meta Cloud API | Production default |
| `wati` | WATI API | Alternative BSP |
| `interakt` | M3 stub | Same interface |

Set `WHATSAPP_PROVIDER=wati` to swap without code changes.

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

## Webhook setup (Meta)

1. Create Meta Business app
2. Add WhatsApp product
3. Callback URL: `https://<api>/webhooks/whatsapp`
4. Verify token: `WHATSAPP_VERIFY_TOKEN`
5. Subscribe: `messages`
