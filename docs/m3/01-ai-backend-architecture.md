# M3 — AI Backend Architecture

## Layered design

```
Routes (advisory.routes, proxy, whatsapp webhook)
    ↓
crop-doctor.service (orchestrator)
    ↓
├── plantIdProvider (supplemental)
├── openaiVisionProvider / openaiTextAdvisory (reasoning)
├── recommendationService (rules → products)
├── escalationService (confidence → agronomist)
├── transcriptionService (Whisper)
└── aiLogService (audit)
```

## Principles

- **Provider abstraction** — `base.provider.ts` interfaces for vision, plant health, transcription
- **Structured JSON** — all GPT outputs validated via Zod-ready types in `types.ts`
- **Event-driven** — `advisory.completed`, `advisory.escalated` on event bus
- **Queue-ready** — `advisory_automation_jobs` + existing `event_outbox`

## Session lifecycle

1. Create `ai_advisory_sessions` (processing)
2. Optional Plant.id → store `plant_id_result`
3. GPT Vision/Text → `ai_advisory_outputs`
4. Recommendations → `ai_product_recommendations`
5. Escalation check → `agronomist_escalations` if needed
6. `disease_history` append
7. Schedule follow-up job (optional)
