# M3 — Whisper Voice Workflow

## Flow

1. `POST /api/v1/advisory/voice` with `audioBase64` (≤ 10MB)
2. Or WhatsApp inbound `audio` → download media → transcribe
3. `POST /v1/audio/transcriptions` with `whisper-1`
4. Language hint: `en` or `ml` from farmer preference
5. Transcript passed to Crop Doctor diagnose pipeline

## Future

- Tamil/Kannada/Hindi hints when locales expand
- Real-time voice conversations (M4+)

Implementation: `transcription.service.ts`, `openai.provider.ts`
