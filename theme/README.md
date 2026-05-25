# Morbeez Shopify Theme (`morbeez-ag`)

Online Store 2.0 theme for agriculture commerce.

## Development

```bash
# From repo root (recommended)
npm install
npm run build:css
npm run theme:dev

# Or from theme/ folder
cd theme
shopify theme dev
```

**Do not** run `shopify theme dev` or `shopify theme push` from repo root without `--path theme` — the CLI treats the repo root as the theme, then tries to **delete** every file on the remote that is not in that empty folder.

## Push commands

| Command | Target | When |
|---------|--------|------|
| `npm run theme:push` | Development `#157069279431` | Daily work (preview URL) |
| `npm run theme:push:live` | Live Morbeez `#157075734727` | Only when publishing to the live store |

Both use `--path theme` and `--nodelete` so Shopify will not try to remove remote-only files.

Avoid the interactive `shopify theme push` menu that asks “Push to live theme Morbeez?” unless you intend to update production.

## M1 implementation status

| Area | Status |
|------|--------|
| Layout + design tokens | Done |
| Header (mega menu + mobile drawer) | Done |
| Homepage (12 sections) | Done |
| PDP + metafield tabs | Done |
| PLP + collection banner | Done |
| Cart, 404, blog, page templates | Done |
| Sticky WhatsApp | Done |
| Gift card + password templates | Done |

See parent [`docs/`](../docs/) for full specifications.
