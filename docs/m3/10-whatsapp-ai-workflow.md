# M3 — WhatsApp AI Workflow

## Inbound

1. Webhook `POST /webhooks/whatsapp`
2. Message type `image` or `audio` + `ENABLE_AI_CROP_DOCTOR=true`
3. Download media via Graph API (`whatsapp-media.ts`)
4. Run `cropDoctorService.diagnose`
5. Reply with summary + products + escalation note

## Text keywords

Messages matching crop/doctor/ginger/Malayalam prompts → instruct user to send photo.

## Outbound

- `advisory.completed` → optional short notification
- Automation worker → follow-up message after 3 days

## Requirements

- `WHATSAPP_ACCESS_TOKEN` with media download permission
- Approved messaging for production outbound
