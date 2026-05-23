# M3 — Future AI Scalability

## Prepared in M3

- Provider interfaces for new models (Gemini, local LLM)
- Multilingual schema (`ta`, `kn`, `hi`)
- `agronomist_escalations.correction` for learning loops
- `event_outbox` + automation jobs for campaigns
- Disease history for analytics

## M4+ roadmap

- Android/iOS direct upload to `/api/v1/advisory/diagnose`
- Zoho sync on escalation create
- Telecaller dashboard (read escalations, add notes)
- Yield intelligence, seasonal alerts
- Recommendation ML from agronomist corrections
- Vector store for past advisories per farmer

## Avoid

- Hardcoding crop logic in routes — keep in `config/recommendations/` + prompts
- Storing images in DB — use Supabase Storage bucket in M3.1
