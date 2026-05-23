# M3 — Prompt Engineering Strategy

## Files

- `prompts/crop-doctor.system.ts` — system prompt + `buildUserPrompt()`

## Rules embedded in system prompt

1. AI-assisted only — no guaranteed diagnosis
2. JSON-only response with fixed schema
3. Ginger-focused MVP
4. English + Malayalam farmer summaries
5. Escalation flags when uncertain

## Maintenance

- Version prompts via git; avoid hot-patching production without review
- M3.1: per-crop prompt files (`ginger.ts`, `paddy.ts`)
- Store `model_version` on `ai_advisory_outputs` for A/B tests

## Testing

- Golden test images (healthy, rhizome rot, nutrient stress)
- Compare confidence + escalation outcomes across prompt versions
