# M2 — Railway Deployment

## Environments

| Env | Branch | URL |
|-----|--------|-----|
| staging | `develop` | `api-staging.morbeez.in` |
| production | `main` | `api.morbeez.in` |

## Setup

1. Create Railway project `morbeez-api`
2. Connect GitHub repo, root: `/backend`
3. Use `railway.toml` build config
4. Add all env vars from `backend/.env.example`
5. Custom domain + SSL

## Supabase environments

| Env | Project |
|-----|---------|
| staging | `morbeez-staging` |
| production | `morbeez-prod` |

Run migrations on each after deploy.

## Production workflow

```bash
git checkout develop
# PR → CI (typecheck) → merge
# Auto-deploy staging

git checkout main
git merge develop
# Manual promote / production deploy
```

## Health monitoring

- Railway healthcheck: `GET /health`
- Uptime monitor (Better Stack / UptimeRobot)
- Log drain: Railway → Axiom or Datadog (optional)

## Rollback

Railway instant rollback to previous deployment. DB migrations are forward-only — test on staging first.
