# M3 — Agronomist Escalation

## Triggers

- Combined confidence &lt; `AI_ESCALATION_THRESHOLD` (default 0.65)
- GPT `uncertain: true`
- GPT `escalationRecommended: true`
- Empty or "uncertain" probable issue

## Actions

1. Insert `agronomist_escalations` (priority: urgent/high/normal)
2. Set session `status: escalated`
3. Emit `advisory.escalated` event
4. WhatsApp message notes agronomist review (when enabled)

## Manual review

- `agronomist_notes`, `correction` JSON for future AI refinement
- Telecaller notes table links farmer + session

Implementation: `escalation.service.ts`, `confidence.ts`
