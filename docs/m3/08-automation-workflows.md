# M3 — Automation Workflows

## Job types (`advisory_automation_jobs`)

| Type | Default schedule |
|------|------------------|
| `whatsapp_follow_up` | +3 days after advisory |
| `callback_reminder` | +4 hours after callback request |

## Worker

`advisory-automation.worker.ts` polls every 60s when `ENABLE_ADVISORY_AUTOMATION=true`.

## Future (architecture-ready)

- `seasonal_alert`, `follow_up_reminder`
- Telecaller assignment from escalation queue
- Disease outbreak campaigns
