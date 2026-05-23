# M3 — Confidence Scoring Strategy

## Formula

```
merged = gptConfidence * 0.6 + plantIdMaxProbability * 0.4
```

If no Plant.id result, plant signal defaults to 0.5.

## Escalation threshold

Default: **0.65** (`AI_ESCALATION_THRESHOLD`)

## Priority mapping

| Confidence | Priority |
|------------|----------|
| &lt; 0.40 | urgent |
| &lt; 0.55 | high |
| else | normal |

## Overrides

GPT explicit `uncertain` or `escalationRecommended` always escalates regardless of score.

Tests: `backend/tests/confidence.test.ts`
