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

**Do not** run `shopify theme dev` from repo root without `--path theme` — the CLI will look in the wrong folder and show delete errors for `layout/theme.liquid`, `gift_card.liquid`, and config files.

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
