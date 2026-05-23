# M3 — Railway Deployment

## Steps

1. Merge M3 code; run `supabase db push` for migration
2. Railway → backend service → add env vars from `.env.example` (M3 section)
3. Set `ENABLE_AI_CROP_DOCTOR=false` until UAT passes
4. Deploy; verify `GET /health`
5. Test diagnose with staging keys
6. Enable flags progressively

## Monitoring

- Railway logs + `ai_request_logs` error rate
- Alert on escalation queue depth (`agronomist_escalations` where status=pending)
- OpenAI usage dashboard for token spend

## Rollback

Disable `ENABLE_AI_CROP_DOCTOR` — WhatsApp falls back to M2 lead classification only.
