# M3 — Plant.id Integration

## Role

Plant.id provides **supplemental disease probability** — GPT-4o remains the reasoning and farmer-language layer.

## API

- Endpoint: `POST https://api.plant.id/v3/health_assessment`
- Auth: `Api-Key` header
- Input: base64 image

## Merge strategy

1. Top diseases formatted into GPT user prompt
2. `computeConfidence()` blends GPT confidence (60%) + max Plant.id probability (40%)
3. Raw response stored in `ai_advisory_sessions.plant_id_result`

## Config

```env
PLANT_ID_API_KEY=
```

Implementation: `backend/src/services/ai/providers/plantid.provider.ts`
