# Admin Console CRUD Matrix

This matrix tracks create/read/update/delete coverage for administrator console modules.

Deletion policy:
- Prefer soft-delete (`active=false`, `archived_at`, `status='archived'`) for business data.
- Hard-delete only for technical/config rows where archive semantics do not exist.

## Legend
- `Y` = available
- `S` = soft-delete/archive supported
- `P` = partial (workflow action only / missing resource parity)
- `N` = not available

| Module | Resource | Create | Read | Update | Delete |
|---|---|---:|---:|---:|---:|
| Employees / Settings | `admin_users` staff | Y | Y | Y | S |
| Telecaller | Leads | Y | Y | Y | S |
| Telecaller | Tasks (`crm_tasks`) | Y | Y | P | S |
| Telecaller | Interactions (`interaction_logs`) | Y | Y | P | S |
| Telecaller | Recommendations (`crm_recommendations`) | Y | Y | P | S |
| Telecaller | Field findings (`crm_field_findings`) | Y | Y | P | S |
| Telecaller | Blocks (`farm_blocks`) | Y | Y | Y | S |
| Agronomist | Recommendation drafts | Y | Y | Y | S |
| Operations | Broadcast rules | Y | Y | Y | S |
| Operations | Crop prices | Y | Y | Y | S |
| Operations | Quick replies | Y | Y | Y | S |
| Operations | Language templates | Y | Y | Y | S |
| Intelligence | Rules/templates masters | Y | Y | Y (upsert) | S |
| Commerce | Farmers | Y | Y | Y | S |
| Commerce | Products | Y | Y | Y | S |
| Commerce | Inventory rows | Y | Y | P | S |
| Commerce | Orders | Y | Y | P | S |

## Rollout notes
- Phase 1: Staff + Telecaller + Agronomist endpoints and UI actions.
- Phase 2: Operations + Intelligence + Commerce + Settings actions.
- Phase 3: Add audit and guardrails (last super-admin, referenced-record protection).
