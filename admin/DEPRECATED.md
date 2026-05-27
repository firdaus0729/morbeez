# Legacy admin UI — deprecated

The vanilla JS console under `admin/js/` is **deprecated** as of Phase 8.

## Use instead

| Old | New |
|-----|-----|
| `/console/` (legacy HTML/JS) | `/console/` — React app (`backend/console-ui/`) |
| Field visits (manual CRM only) | `/field/` — Field PWA (`backend/field-pwa/`) |

## Build & run

From `backend/`:

```bash
npm run build    # compiles API + console-ui + field-pwa
npm start
```

The API **only** serves the React build from `backend/console-ui/dist/`.  
If the build is missing, `/console/` returns a clear error instead of falling back to this folder.

## APIs unchanged

All `/console/api/v1/*` routes remain. Legacy UI called the same endpoints; the React app uses them directly.

## This folder

Kept for reference and git history. Do not extend `admin/js` for new features.
