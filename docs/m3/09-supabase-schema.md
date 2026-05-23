# M3 — Supabase Schema

Migration: `supabase/migrations/20260523100000_m3_ai_advisory.sql`

## Tables

| Table | Purpose |
|-------|---------|
| `ai_advisory_sessions` | Diagnosis session root |
| `ai_advisory_outputs` | Structured GPT output |
| `ai_product_recommendations` | Product mapping results |
| `agronomist_escalations` | Human review queue |
| `telecaller_notes` | Manual notes |
| `disease_history` | Analytics / farmer history |
| `advisory_automation_jobs` | Scheduled follow-ups |
| `ai_request_logs` | Provider audit trail |

## Relationships

All child tables FK → `farmers`, `ai_advisory_sessions`.

## RLS

Service role only (same pattern as M2).
