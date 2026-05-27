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

## Next batch (not yet coded)

Broadcasts (21–24), multi-plot (29), order/payment (35–36), cultivation logging (30–31, 37), AI reuse (38), broadcast throttling (40), CRM notes (41), knowledge broadcasts (42).
