# Morbeez WhatsApp OS — Implementation Roadmap

North star: WhatsApp is the farmer relationship + sales CX engine; staff console scales human validation.

## Principles

- Vertical slices over 40 parallel modules
- Rules + RAG + playbooks before custom model training
- One question at a time; short replies; advisor/expert on low confidence
- Reuse existing tables (`recommendation_records`, `crm_tasks`, `conversation_sessions`, `spray_compatibility_rules`)

## Phases

| Phase | Focus | Status |
|-------|--------|--------|
| **1** | Router foundation: menu (Crop Assessment / Track / Callback / More), response composer, input classifier, assessment playbooks, previous recommendations | **Done** |
| **2** | Vision image classifier + text merge, blurry/dark photo handling, spray compatibility DB lookup on WhatsApp | **Done** |
| **3** | Message fatigue, seasonal broadcast priority, farmer health score for telecaller prioritization | **Done** |
| **4** | ROI tracker + ledger (WhatsApp flows, audit) | **Done** |
| **5** | Self-learning loop: advisor correction → `ai_reuse` eligibility, terminology closure | **Done** |
| **6** | Farmer Experience Learning: disagreement capture → agronomist validation → verified reuse | **Done** |

## Phase 2 — Files

- `backend/src/services/whatsapp/pipeline/image-input-classifier.service.ts`
- `backend/src/services/whatsapp/pipeline/compatibility-lookup.service.ts`
- `input-classifier.service.ts` — `mergeWithVision()`
- `whatsapp-inbound.pipeline.ts` — vision + compatibility in `tryAssessmentPlaybook`
- `image-quality.service.ts` — `blurry` / `too_dark` messages

## Phase 3 — Files

- `backend/src/services/whatsapp/pipeline/message-fatigue.service.ts`
- `backend/src/services/whatsapp/pipeline/seasonal-priority.service.ts`
- `backend/src/services/whatsapp/pipeline/farmer-health-score.service.ts`
- `broadcast-throttle.service.ts`, `broadcast-engine.service.ts`, `telecaller-tasks.service.ts`

## Phase 4 — Files

- `supabase/migrations/20260625000000_farmer_roi_ledger.sql`
- `backend/src/services/whatsapp/roi/roi-flow.service.ts`
- `backend/src/services/whatsapp/roi/ledger-summary.service.ts`
- Menu: **ROI Tracker** (main), **Farm Ledger** (More)
- Env: `ENABLE_WHATSAPP_ROI=true`, `ENABLE_ROI_DAILY_PROMPT=true` (defaults)
- Worker: `roi-daily-prompt.worker.ts` — IST **18:00–20:59**, once per day per opted-in farmer
- Inbound fallback: if farmer messages after 6 PM and router did not handle, send today's prompt once
- Staff manual run: `POST /morbeez-staff/api/v1/.../operations/roi/daily-prompts/run`

## Phase 5 — Files

- `backend/src/services/core/learning-loop.service.ts`
- Terminology resolve → `agronomy_terms` (staff Operations → terminology tasks)
- Follow-up outcome **improved/partial** → `advisory_reuse_cases` via `learningLoopService`

## Phase 6b — Conversational memory (WhatsApp)

- `backend/src/services/whatsapp/pipeline/farmer-memory.service.ts` — unified crop + plot + `interaction_logs` + session context
- `backend/src/services/whatsapp/pipeline/agronomy-reply.service.ts` — tank-mix DB → OpenAI with memory (no generic welcome)
- `whatsapp-conversational.service.ts` — memory-aware prompts; Crop Doctor gets `whatsappContext` from compact history
- Skip FAQ cache for explicit agronomy questions; image flow respects `knownCropLocked`
- `farmer-reply-polish.service.ts` — facts-locked OpenAI paraphrase for DB tank-mix + Crop Doctor summaries (`ENABLE_WHATSAPP_REPLY_POLISH`)
- Farmer memory loads agronomist `verifiedRegionalHints` into Crop Doctor + conversational prompts
- `openai-quota.service.ts` + `knowledge-fallback.service.ts` — on `insufficient_quota` / 429, log warn and reply from reuse DB, Ca chart, drench rules (no empty welcome)

## Phase 6d — Weather + local diagnosis context

- `weather-fetch.service.ts` — Open-Meteo with humidity; pincode lat/lon from `pincode_master`
- `context-pack.service.ts` — season phase, disease–weather priors, nearby pincode cases
- `disease-weather-rules.service.ts` — blast/Pyricularia in monsoon + humidity, thrips, rot rules
- `nearby-cases.service.ts` — peer farmers same pincode / district disease history (30d)
- Crop Doctor + conversational prompts receive `environmentalContext`; policy adds humidity safety notes

## Phase 6c — Module attribution (USP)

- `supabase/migrations/20260633000000_whatsapp_reply_attributions.sql` — per-reply module source
- `reply-attribution.service.ts` — farmer one-liner (“Morbeez verified cases… Not generic ChatGPT”) + analytics log
- Wired on playbook, agronomy, knowledge fallback, conversational, Crop Doctor paths
- `GET /morbeez-staff/api/v1/os/analytics/module-precision` — Console **Analytics → Morbeez precision**

## Phase 6 — Farmer Experience Learning (FEX)

- `supabase/migrations/20260630000000_farmer_experience_learning.sql` — `farmer_advisory_feedback`
- `supabase/migrations/20260630100000_farmer_experience_learning_v2.sql` — `local_practices`, `farmer_experience_stats`, `crop_experience_years`
- `backend/src/services/core/farmer-feedback-intent.service.ts` — disagreement detection
- `backend/src/services/core/farmer-experience-learning.service.ts` — review + promote to reuse
- `backend/src/services/core/farmer-experience-weight.service.ts` — trust score / weighting (§7)
- `backend/src/services/core/local-practices.service.ts` — verified practice library (§8–9)
- `backend/src/services/whatsapp/scenarios/farmer-feedback-flow.service.ts` — WhatsApp capture (+ years of experience)
- Agronomist Hub → **Farmer feedback** tab; API under `/os/agronomist/farmer-feedback`
- After diagnosis: optional **AI is wrong** button; text like "this is thrips" starts capture
- Approved feedback → `advisory_reuse_cases` + `local_practices` + Crop Doctor regional hints
- Telecaller **Edit farmer** → years growing crop (`crop_experience_years` on `farmers`)

## Verify on WhatsApp

1. **Vision routing:** Send insect photo (or caption "caterpillar") → insect playbook before crop doctor.
2. **Compatibility:** `Can I mix Mancozeb and Copper oxychloride?` → DB rule + jar-test note (seed data in migration).
3. **Blurry photo:** Very unclear image → “send one close sharp photo” (vision quality).
4. **Fatigue:** Farmers who ignore many outbound messages get fewer low-priority broadcasts.
5. **Telecaller:** At-risk farmers get `high` priority on new CRM tasks when health score is low.

## Golden journey (acceptance)

1. Farmer: Hi → contextual greeting → main menu (Crop Assessment, Track Order, Call Back, More)
2. Crop Assessment → crop/plot picker → photo → vision classify → playbook or crop doctor → short reply + one question
3. More → Previous recommendations (last 3)
4. Tank mix question → compatibility lookup from `spray_compatibility_rules` + Morbeez **Calcium Nitrate chart** (`calcium-nitrate-tank-mix.knowledge.ts`, migration `20260631100000_calcium_nitrate_tank_mix_rules.sql`)
5. Low-confidence pest → expert review + telecaller task (4h SLA)
