# M1 — 100% Completion Checklist

## Theme code (repository) ✅

### Foundation
- [x] Online Store 2.0 theme structure
- [x] Section groups (header/footer + announcement)
- [x] JSON templates: index, product, collection, cart, page, blog, article, search, 404, password, gift_card, list-collections
- [x] Tailwind build + `theme.css`
- [x] Theme Check CI
- [x] `en.default.json` + `en.default.schema.json` + `ml.json` scaffold

### Homepage (12 sections + WhatsApp)
- [x] hero-premium (mobile image, overlay opacity)
- [x] crop-categories, shop-by-problem
- [x] featured-collection, combo-offer
- [x] seasonal-campaign (metaobject `morbeez_campaign_banner` optional)
- [x] flash-sale (countdown)
- [x] advisory-education, testimonials, blog-preview
- [x] ai-crop-doctor-cta, dealer-enquiry-cta
- [x] sticky-whatsapp-cta (global + theme settings fallback)

### Catalog
- [x] PDP metafield tabs + related products
- [x] Collection banner, subcollection nav, Storefront filters UI, pagination rel prev/next
- [x] SEO body metafield on PLP

### SEO & schema
- [x] meta-tags, preconnect CDN
- [x] Organization, Product, Article, FAQ, BreadcrumbList JSON-LD
- [x] Visual breadcrumbs

### Navigation & i18n
- [x] Mega menu + mobile drawer
- [x] Language switcher (Markets-ready)
- [x] No hardcoded UI strings in Liquid (`| t`)

### Admin / settings
- [x] Brand colors, logo, font pickers
- [x] Feature flags, global WhatsApp settings
- [x] All sections have presets / Theme Editor settings

### Tooling
- [x] `config/metafields.json`
- [x] `config/collections-seed.csv`
- [x] `config/metaobjects.json`
- [x] `scripts/setup-m1.mjs` (metafield definitions via Admin API)
- [x] Full architecture docs in `docs/`

---

## Shopify store (your action) — run to close M1 operationally

```powershell
# 1. Install metafield definitions
copy .env.example .env
# Edit .env with Admin API token
npm run setup:m1

# 2. Theme dev
cd theme
shopify theme dev --store morbeez.myshopify.com
```

Then complete [`M1-STORE-SETUP.md`](M1-STORE-SETUP.md):

- [ ] Navigation menus (`main-menu`, footer)
- [ ] Collections + product tags from CSV
- [ ] 10–20 sample products with metafields
- [ ] Blog `advisory` + 3 articles
- [ ] Pages: crop-doctor, dealer-enquiry
- [ ] Apps: Translate & Adapt, Search & Discovery, Shopify Forms
- [ ] Markets: EN + ML when ready
- [ ] Theme Editor: link homepage tiles to collections
- [ ] Lighthouse mobile ≥ 85 on Home, PLP, PDP

---

## Sign-off

| Layer | Status |
|-------|--------|
| **Code & docs** | ✅ M1 complete |
| **Live store config** | ⏳ Merchant/Dev (checklist above) |
| **QA / Lighthouse** | ⏳ After store populated |
