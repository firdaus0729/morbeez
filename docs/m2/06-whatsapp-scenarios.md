# WhatsApp OS — Scenarios (implementation status)

## Deploy checklist

1. Run Supabase migrations:
   - `20260602000000_whatsapp_conversation_state.sql`
   - `20260603000000_whatsapp_scenarios_ext.sql`
2. Redeploy `morbeez-api` on Render.

## Implemented in this batch

| Scenario | Feature |
|----------|---------|
| 1 | Greeting → language list → main menu |
| 2 | Image diagnosis (1st image prompts more, 2nd+ runs Crop Doctor) |
| 3 | Water volume → quantity calculation |
| 4 | Pack size round-up (`product_pack_sizes`) |
| 5–6 | Technical-only / unavailable copy after diagnosis |
| 7 | Cardamom “chimb” terminology + drainage buttons |
| 8–9 | Unknown term → review task + clarify prompt |
| 11 | Returning farmer welcome + DAP line |
| 12–14, 43 | Soil menu, address, testing callback, report upload ack |
| 15–16, 18 | Root photo request, low-confidence + callback buttons |
| 20 | Expert / callback → CRM task + `callback_requests` |
| 25–26 | Weather via Open-Meteo (district coords) |
| 27–28 | Daily prices from `crop_daily_prices` (+ last year) |
| 39 | Duplicate image reuses previous summary |
| 44 | All replies use stored `preferred_language` |

## Main menu IDs

- `menu.diagnosis` — send crop photos
- `menu.weather` — 3-day forecast + spray hint
- `menu.prices` — admin prices for primary crop
- `menu.soil` — soil sub-menu
- `menu.expert` — callback

Type **menu** anytime to reopen the main list.

## Admin API

- `GET /admin/api/whatsapp/crop-prices?crop=ginger`
- `POST /admin/api/whatsapp/crop-prices` — upsert today’s price

## Broadcasts (Scenarios 21–24 + 40) — implemented

Migration: `20260604000000_whatsapp_broadcasts.sql`

| Kind | Scenario | Trigger |
|------|----------|---------|
| `cultivation_schedule` | 21 | Monday (IST), weekly field-work message |
| `fertigation_reminder` | 22 | DAP window (e.g. ginger ~45 DAP) |
| `pgr_broadcast` | 23 | DAP window (e.g. cardamom ~75 DAP) |
| `dap_task` | 24 | Exact DAP (e.g. ginger 60±3 → rhizome rot scouting) |

**Throttling (40):** max 2 broadcasts/farmer/day (high-priority DAP tasks can use +1), same kind blocked for 72h, skips AI-paused/human takeover, crop must match.

**Worker:** runs in IST **07:00–09:59** when `ENABLE_WHATSAPP_BROADCASTS=true`.

**Scenario 26:** cultivation broadcast may prepend heavy-rain alert from Open-Meteo.

### Admin API

- `GET /admin/api/whatsapp/broadcasts/rules`
- `POST /admin/api/whatsapp/broadcasts/rules` — create/update DAP rules
- `GET /admin/api/whatsapp/broadcasts/deliveries`
- `POST /admin/api/whatsapp/broadcasts/run` — `{ "dryRun": true }` or `{ "farmerId": "uuid" }`

### Test broadcast (PowerShell)

```powershell
# Dry run — no WhatsApp send
Invoke-RestMethod -Uri "https://morbeez-api.onrender.com/admin/api/whatsapp/broadcasts/run" `
  -Method POST -Headers @{ Authorization = "Bearer YOUR_ADMIN_JWT" } `
  -ContentType "application/json" -Body '{"dryRun":true}'

# Send to one farmer
Invoke-RestMethod ... -Body '{"farmerId":"FARMER_UUID"}'
```

Set `farmer_crops.planted_at` so DAP matches a rule (e.g. ginger planted 60 days ago for `dap_task`).

## Multi-plot (Scenario 29) — implemented

Migration: `20260605000000_farmer_plot_labels.sql` (`farmer_crops.plot_label`)

- Farmers with **2+** `farmer_crops` rows get a **plot picker** before diagnosis.
- Example: *"Ginger is fine. Cardamom has issue."* → asks which plot; if only one crop has an issue, auto-selects that plot.
- List/button IDs: `plot.<farmer_crop_uuid>`
- Active plot stored on `conversation_sessions.active_plot_id` — Crop Doctor uses that crop/stage.
- Commands: **change plot** / **switch plot** to pick again.
- Diagnosis replies prefixed with `📍 Ginger Plot` (or custom `plot_label`).

### Admin

`PATCH /admin/api/whatsapp/:farmerId/session` body may include `activePlotId`.

## Order tracking & payment failed (Scenarios 35–36) — implemented

Migration: `20260606000000_order_whatsapp_tracking.sql`

### Scenario 35 — Order dispatched
Triggered when:
- Shiprocket creates shipment (`shipment.created`)
- Shiprocket tracking shows picked/shipped (`shipment.dispatched`)
- Shopify fulfillment with tracking (`shopify.order.fulfilled`)

WhatsApp message includes **Tracking ID** (AWB or order name) and **expected delivery** (default: tomorrow IST).

Buttons: **Track Order** · **Help**

### Scenario 36 — Payment failed
Triggered on Razorpay `payment.failed` for a `checkout_sessions` row (phone from checkout customer).

Buttons: **Retry Payment** · **COD** · **Help**

### Farmer can also type
- `track order` / `order status` → latest order status
- `Retry` / `COD` / `Help` (text fallback)

### Env
```env
ENABLE_WHATSAPP_ORDER_ALERTS=true
SHOPIFY_STOREFRONT_URL=https://morbeez.myshopify.com
```

## Cultivation logging (Scenarios 30–31, 37) — implemented

Migration: `20260607000000_cultivation_activities.sql`

### Scenario 37 — Farmer logs spray
Messages like **"Spray completed"** / **"സ്പ്രേ ചെയ്തു"** → records `cultivation_activities` + schedules result check in **10 days**.

### Scenario 30 — Application check (5 days)
After order dispatch or Crop Doctor with product recommendations:
- WhatsApp: *Have you applied the recommendation?*
- Buttons: **Applied** · **Not Yet** · **Need Help**
- **Applied** → logs activity, schedules Scenario 31 in 10 days

### Scenario 31 — Result validation (10 days after applied)
- *How is the crop now?*
- Buttons: **Better** · **Partial** · **No Improve** (list also has **Need Agronomist**)
- **No improvement** → agronomist escalation + telecaller task

### Env
```env
ENABLE_CULTIVATION_FOLLOW_UPS=true
ENABLE_ADVISORY_AUTOMATION=true
CULTIVATION_APPLICATION_DAYS=5
CULTIVATION_RESULT_DAYS=10
```

### Data
Table `cultivation_activities` — visible to admin/CRM (AI, telecaller, agronomist context via farmer profile).

## AI reuse cache (Scenario 38) — implemented

Migration: `20260608000000_ai_reuse_crm_knowledge.sql` → table `advisory_reuse_cases`

After a **successful** Crop Doctor run (confidence ≥ 0.65, not escalated), the case is indexed by:
- crop type
- district (empty = global fallback)
- DAP bucket (15-day buckets)
- symptom fingerprint (text / voice / history hash)

On the next matching diagnosis, the system **reuses the prior advisory** and skips OpenAI (saves cost). Farmer sees a short “similar case” footnote.

```env
ENABLE_AI_REUSE_CACHE=true
```

## CRM internal notes (Scenario 41) — implemented

Table `crm_internal_notes` — **staff-only**, never sent on WhatsApp.

Examples: evening-call preference, high acreage, repeated monsoon fungal issues.

### Admin API
- `GET /admin/api/crm/farmers/:farmerId/internal-notes`
- `POST /admin/api/crm/farmers/:farmerId/internal-notes` — `{ "body", "category?", "pinned?" }`
- `PATCH /admin/api/crm/internal-notes/:noteId`
- `DELETE /admin/api/crm/internal-notes/:noteId` (archives)

Included in telecaller CRM bundle: `GET .../telecaller/leads/:id/crm` → `internalNotes`.

## Cultivation knowledge broadcasts (Scenario 42) — implemented

New broadcast kind: **`cultivation_knowledge`**

Example (cardamom ~78 DAP): vegetative flush — nitrogen split dose, neem cake, drainage, root zone cleaning.

Seeded rules for **cardamom** and **ginger**. Admin can add rules via `POST /admin/api/whatsapp/broadcasts/rules` with `broadcastKind: "cultivation_knowledge"`.

## All 45 scenarios — status

| # | Status |
|---|--------|
| 1–20, 25–31, 35–37, 39–40, 43–44 | Implemented (see sections above) |
| 21–24, 26, 29, 40 | Broadcasts + multi-plot |
| 38, 41, 42 | This batch |
| 45 | Prompt style in `crop-doctor.system.ts` (ongoing tuning) |
