# Morbeez OS — Admin Implementation Plan (locked decisions)

## Architecture principles

- **Single app:** `/console` with RBAC (no separate apps initially).
- **Source of truth:** `farm_blocks` only (no `farmer_crops` in new code).
- **Canonical recommendations:** `recommendation_records` (analytics + outcomes).
- **Geography:** `pincode_master` → village → taluk → district → state.
- **Rule-first:** AI for image diagnosis, complex agronomy, unknown terms, response smoothing only.
- **Agronomist = field staff** (one role). Recommendations require **admin approval**.
- **No offline** for field PWA (online mobile web).
- **Product gap:** aggregated when `recommendation_count >= 5` for a technical name.
- **Phase-1 crops:** ginger, banana, cardamom, pepper, vegetables (+ tomato/chilli/brinjal).
- **Phase-1 languages:** ml, ta, kn, en (multilingual master fields).

## Implementation phases

### Phase 1 — Foundation (current sprint)

| # | Deliverable | Status |
|---|-------------|--------|
| 1.1 | DB: `pincode_master`, block columns, `recommendation_records`, `weather_rule_definitions`, `product_gap_queue`, RBAC | Migration |
| 1.2 | Migrate `farmer_crops` → `farm_blocks`, `active_block_id` on sessions | Migration |
| 1.3 | `block.service`, `pincode.service`, `recommendation-records.service`, `rbac` | Done |
| 1.4 | WhatsApp/broadcast/AI context uses `farm_blocks` | Done |
| 1.5 | Admin APIs: pincode lookup, blocks CRUD, recommendation workflow | Done (`/console/api/v1/os/*`) |
| 1.6 | React `console-ui/` scaffold + login + role-based shell | Done (login, RBAC nav, approvals, gaps, pincode) |

### Phase 2 — Operations Center UI

| # | Deliverable | Status |
|---|-------------|--------|
| 2.1 | RBAC APIs `/console/api/v1/os/operations/*` | Done |
| 2.2 | React: Broadcasts, prices, terminology, messaging config, weather rules list | Done |
| 2.3 | Quick replies, language templates, automation job viewer | Done |

Broadcast Center, Daily Pricing, Terminology queue, Meta messaging settings (env read-only), weather rules list. Phase 2.3 adds CRUD for `whatsapp_quick_replies` and `whatsapp_language_templates`, plus advisory automation job list/stats/cancel/retry under Operations.

### Phase 3 — Telecaller CRM completion

| # | Deliverable | Status |
|---|-------------|--------|
| 3.1 | RBAC APIs `/console/api/v1/os/telecaller/*` | Done |
| 3.2 | React workspace: leads list, profile tabs, blocks/DAP, WhatsApp | Done |
| 3.3 | Full modals: add block, interaction, recommendation, orders, calls, tasks, visits | Done |
| 3.4 | Escalations UI, export/share, CRM master pickers | Done |

Farmer profile tabs: overview, blocks (DAP), interactions, recommendations, field findings, orders, WhatsApp. Write actions via `/console/api/v1/os/telecaller/*`.

### Phase 4 — Agriculture Intelligence masters

| # | Deliverable | Status |
|---|-------------|--------|
| 4.1 | DB: cultivation tasks, rec templates, spray compat, resistance rotation | Migration `20260610000000` |
| 4.2 | APIs `/console/api/v1/os/intelligence/*` | Done |
| 4.3 | React Intelligence hub (pincode + 5 master tabs) | Done |

Cultivation task master, weather rule engine UI (full CRUD), recommendation templates, spray compatibility, resistance rotation. Product gaps remain under separate nav item.

### Phase 5 — Agronomist workflow + admin approval

| # | Deliverable | Status |
|---|-------------|--------|
| 5.1 | DB: `field_finding_id` on `recommendation_records` | Migration `20260612000000` |
| 5.2 | APIs `/console/api/v1/os/agronomist/*` + approve→WhatsApp | Done |
| 5.3 | React Agronomist hub + enhanced Approvals | Done |

Field findings → AI suggestion → agronomist review → `pending_approval` → super_admin approve → WhatsApp `communicated` + optional follow-up job.

### Phase 6 — Field PWA (online)

| # | Deliverable | Status |
|---|-------------|--------|
| 6.1 | DB: `field_visit_questionnaire`, storage bucket `field-visits` | Migration `20260613000000` |
| 6.2 | APIs `/console/api/v1/os/field/*` (search, blocks, questionnaire, submit visit) | Done |
| 6.3 | React `field-pwa/` at `/field/` (mobile visit form + camera photos) | Done |

Mobile questionnaire answer + photo upload (no offline). Submits `crm_field_findings` with real `photo_urls` for Phase 5 agronomist review.

### Phase 7 — Analytics (pincode-first)

| # | Deliverable | Status |
|---|-------------|--------|
| 7.1 | APIs `/console/api/v1/os/analytics/*` | Done |
| 7.2 | React Analytics hub (geography, retention, broadcasts, recommendations) | Done |

District heatmaps (pincode-first district + drill-down), retention cohorts, broadcast performance, recommendation success funnel.

### Phase 8 — Deprecate legacy vanilla `admin/js`

| # | Deliverable | Status |
|---|-------------|--------|
| 8.1 | Serve React `console-ui/dist` only (no `admin/` fallback) | Done |
| 8.2 | SPA fallback for `/console/*` client routes | Done |
| 8.3 | React Commerce + Settings + dashboard cutover | Done |
| 8.4 | `admin/DEPRECATED.md` — legacy UI frozen | Done |

Full cutover to React build output. Legacy `admin/js` is no longer served.

## Role → module matrix (Phase 1)

| Module | super_admin | operations | agronomist | telecaller | viewer |
|--------|-------------|------------|------------|------------|--------|
| dashboard | ✓ | ✓ | ✓ | ✓ | ✓ |
| telecaller_crm | ✓ | ✓ | ✓ | ✓ | read |
| operations | ✓ | ✓ | read | — | — |
| intelligence | ✓ | read | ✓ | read | read |
| agronomist | ✓ | read | ✓ | — | read |
| commerce | ✓ | ✓ | read | read | read |
| automation | ✓ | ✓ | read | — | — |
| analytics | ✓ | ✓ | ✓ | — | read |
| settings | ✓ | — | — | — | — |
| approve_recommendations | ✓ | — | — | — | — |

## Recommendation workflow states

`draft` → `pending_approval` → `approved` → `communicated` → `applied` → `outcome_recorded`

Admin (`super_admin`) approves `pending_approval` → `approved`.
