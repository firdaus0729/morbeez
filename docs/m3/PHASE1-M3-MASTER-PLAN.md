# Morbeez — Phase 1 Milestone 3 Master Plan

**Milestone:** AI Crop Doctor MVP, Automation & Production Deployment  
**Timeline:** 2–3 weeks  
**Stack:** Fastify · Supabase · OpenAI (GPT-4o Vision + Whisper) · Plant.id · WhatsApp · Shopify

---

## 1. Executive summary

M3 delivers the first **production-ready AI-assisted advisory layer** for Morbeez — integrated with M1 (Shopify theme) and M2 (operational API, farmers, WhatsApp, CRM).

**Positioning:** AI-assisted recommendations with agronomist escalation — **not** autonomous guaranteed diagnosis.

```
Farmer (WhatsApp / Web / API)
    → Morbeez API (Crop Doctor orchestrator)
        → Plant.id (supplemental signal)
        → GPT-4o Vision / Text (reasoning + multilingual output)
        → Confidence + escalation
        → Product rules engine → Shopify handles
        → Supabase history + automation jobs
```

---

## 2. Deliverables map

| # | Topic | Document |
|---|--------|----------|
| 1 | AI backend architecture | [`01-ai-backend-architecture.md`](01-ai-backend-architecture.md) |
| 2 | GPT-4o Vision workflow | [`02-gpt4o-vision-workflow.md`](02-gpt4o-vision-workflow.md) |
| 3 | Plant.id integration | [`03-plantid-integration.md`](03-plantid-integration.md) |
| 4 | Whisper voice | [`04-whisper-voice.md`](04-whisper-voice.md) |
| 5 | Multilingual advisory | [`05-multilingual-advisory.md`](05-multilingual-advisory.md) |
| 6 | Product recommendation | [`06-product-recommendation.md`](06-product-recommendation.md) |
| 7 | Escalation logic | [`07-escalation-logic.md`](07-escalation-logic.md) |
| 8 | Automation workflows | [`08-automation-workflows.md`](08-automation-workflows.md) |
| 9 | Supabase schema | [`09-supabase-schema.md`](09-supabase-schema.md) |
| 10 | WhatsApp AI workflow | [`10-whatsapp-ai-workflow.md`](10-whatsapp-ai-workflow.md) |
| 11 | Prompt engineering | [`11-prompt-engineering.md`](11-prompt-engineering.md) |
| 12 | Confidence scoring | [`12-confidence-scoring.md`](12-confidence-scoring.md) |
| 13 | Security | [`13-security.md`](13-security.md) |
| 14 | Railway deployment | [`14-railway-deployment.md`](14-railway-deployment.md) |
| 15 | Future scalability | [`15-future-scalability.md`](15-future-scalability.md) |

**Ops:** [`M3-STORE-SETUP.md`](M3-STORE-SETUP.md) · [`M3-COMPLETION.md`](M3-COMPLETION.md)

---

## 3. Code locations

| Component | Path |
|-----------|------|
| Crop Doctor orchestrator | `backend/src/services/ai/crop-doctor.service.ts` |
| Providers | `backend/src/services/ai/providers/` |
| Prompts | `backend/src/services/ai/prompts/` |
| Recommendations | `backend/config/recommendations/ginger.json` |
| API routes | `backend/src/routes/api/advisory.routes.ts` |
| App proxy | `POST /proxy/advisory/diagnose` |
| Migration | `supabase/migrations/20260523100000_m3_ai_advisory.sql` |
| Theme form | `theme/sections/crop-doctor-form.liquid` |

---

## 4. Success criteria

- [x] GPT-4o Vision + text advisory pipeline
- [x] Plant.id supplemental health assessment
- [x] Whisper transcription (en/ml)
- [x] English + Malayalam farmer summaries
- [x] Ginger product recommendation rules
- [x] Confidence + agronomist escalation
- [x] Supabase advisory history tables
- [x] WhatsApp image/audio → Crop Doctor (flag-gated)
- [x] Automation jobs (follow-up, callback)
- [x] Theme Crop Doctor page + app proxy
- [ ] Railway production deploy + UAT
- [ ] OpenAI / Plant.id keys in production
- [ ] Agronomist review process live

---

## 5. Implementation roadmap (2–3 weeks)

### Week 1 — AI core
| Day | Focus |
|-----|-------|
| D1 | Supabase M3 migration, env, provider layer |
| D2 | GPT-4o Vision + structured JSON prompts |
| D3 | Plant.id merge + confidence scoring |
| D4 | Whisper voice + multilingual output |
| D5 | API routes + unit tests |

### Week 2 — Integration
| Day | Focus |
|-----|-------|
| D6 | WhatsApp image/audio pipeline |
| D7 | Product recommendation rules + Shopify handles |
| D8 | Escalation + telecaller hooks |
| D9 | Automation worker + follow-ups |
| D10 | Theme Crop Doctor form + app proxy |

### Week 3 — Production
| Day | Focus |
|-----|-------|
| D11 | Railway deploy, monitoring |
| D12 | Security review, rate limits |
| D13–D15 | UAT (ginger, en/ml), agronomist workflow |

---

## 6. Development task breakdown

1. Apply `20260523100000_m3_ai_advisory.sql`
2. Set `OPENAI_API_KEY`, `PLANT_ID_API_KEY`
3. Enable `ENABLE_AI_CROP_DOCTOR=true` after UAT
4. Create Shopify page `crop-doctor` with template `page.crop-doctor`
5. Extend app proxy: `/apps/morbeez/advisory/diagnose`
6. Test API: `POST /api/v1/advisory/diagnose` with `x-api-key`
7. Test WhatsApp: send crop image to business number
8. Review escalations in `agronomist_escalations` table

---

## 7. API design

| Method | Path | Auth |
|--------|------|------|
| POST | `/api/v1/advisory/diagnose` | `x-api-key` |
| POST | `/api/v1/advisory/voice` | `x-api-key` |
| GET | `/api/v1/advisory/:sessionId` | `x-api-key` |
| POST | `/api/v1/advisory/:sessionId/callback` | `x-api-key` |
| POST | `/proxy/advisory/diagnose` | Shopify app proxy signature |

---

## 8. Testing strategy

- **Unit:** `tests/confidence.test.ts`, HMAC/phone (M2)
- **Integration:** mock OpenAI in CI (skip live calls); manual UAT with real keys
- **WhatsApp:** test image + Malayalam voice note
- **Escalation:** force low-confidence image → `agronomist_escalations` row

---

## 9. Deployment checklist

See [`14-railway-deployment.md`](14-railway-deployment.md) and [`M3-STORE-SETUP.md`](M3-STORE-SETUP.md).
