# M3 — GPT-4o Vision Workflow

## Pipeline

1. Validate image ≤ 5MB, `image/*` mime
2. Optional Plant.id health assessment (parallel signal)
3. Build user prompt: crop, stage, symptoms, transcript, Plant.id summary, farmer history
4. `POST /v1/chat/completions` with `gpt-4o`, `response_format: json_object`
5. Parse structured advisory JSON
6. Persist + recommend + escalate

## Retry / fallback

- Plant.id failure → continue with GPT only (logged in `ai_request_logs`)
- GPT failure → session `status: failed`, return 502
- No image → text-only `openaiTextAdvisory` path

## Config

```env
OPENAI_API_KEY=
OPENAI_VISION_MODEL=gpt-4o
OPENAI_TEXT_MODEL=gpt-4o
```

Implementation: `backend/src/services/ai/providers/openai.provider.ts`
