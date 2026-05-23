# Morbeez — Phase 1 Milestone 1 Master Plan

**Client:** Morbeez  
**Milestone:** Planning, UI/UX & Shopify Foundation  
**Timeline:** 1–2 weeks  
**Budget envelope:** ~₹1L INR (production milestone)  
**Date:** May 2026

---

## 1. Executive summary

Morbeez is a **Shopify-first**, **WhatsApp-ready**, **AI-ready** agriculture commerce platform. Milestone 1 establishes the **commercial and content foundation** on Shopify Online Store 2.0—not a generic theme install, but a **modular, section-driven, metafield-backed** storefront that a non-technical admin can operate and that engineering can extend without rewrites.

### Strategic decisions (locked for M1)

| Decision | Recommendation | Rationale |
|----------|----------------|-----------|
| Commerce core | Shopify Plus-ready (start Standard) | Native checkout, collections, markets, metafields |
| Theme base | **Custom OS 2.0 theme** (Dawn patterns, not full Dawn fork) | Premium UX, no bloat, full control |
| CSS | **Tailwind via build step** (PostCSS) compiled to `assets/theme.css` | Utility speed + single CSS payload |
| JS | **Vanilla + Alpine.js** (islands only) | Lightweight; no React in theme |
| i18n | **Shopify Markets + Translate & Adapt** + metafield locale keys | No hardcoded language logic in Liquid |
| Content model | **Metaobjects + product metafields** | Dosage, crops, diseases, FAQ—structured |
| Version control | **GitHub + Shopify CLI + theme check CI** | Agency-grade workflow |

### Success criteria (M1 exit)

- [ ] Theme deployable to development store with all homepage sections editable in Theme Editor
- [ ] Collection taxonomy created (crop, problem, category) with navigation wired
- [ ] Product metafield definitions installed; sample products populated
- [ ] Mega menu + mobile drawer navigation functional
- [ ] Lighthouse mobile Performance ≥ 85, Accessibility ≥ 90 (realistic pre-launch target)
- [ ] Documentation handed off for M2 (WhatsApp, AI, API)

---

## 2. Recommended Shopify theme architecture

### 2.1 Layered architecture

```
┌─────────────────────────────────────────────────────────────┐
│  Shopify Admin (Content, Products, Markets, Metafields)      │
└───────────────────────────┬─────────────────────────────────┘
                            │
┌───────────────────────────▼─────────────────────────────────┐
│  JSON Templates (index, product, collection, page, blog)     │
│  + Section groups (header, footer, overlay)                    │
└───────────────────────────┬─────────────────────────────────┘
                            │
┌───────────────────────────▼─────────────────────────────────┐
│  Sections (homepage blocks, PLP filters UI, PDP tabs)           │
│  → Snippets (cards, badges, CTAs, icons)                       │
│  → Blocks (merchant-configurable sub-units)                    │
└───────────────────────────┬─────────────────────────────────┘
                            │
┌───────────────────────────▼─────────────────────────────────┐
│  Assets (compiled CSS, minimal JS, optimized images)         │
│  Locales (en.default.json — keys only, no copy in Liquid)    │
└───────────────────────────┬─────────────────────────────────┘
                            │
┌───────────────────────────▼─────────────────────────────────┐
│  Future: App proxies / Storefront API / Hydrogen (optional)  │
└─────────────────────────────────────────────────────────────┘
```

### 2.2 Design system tokens (CSS custom properties)

Define in `snippets/css-variables.liquid` and consume everywhere:

- **Brand:** `--color-primary` (deep ag green), `--color-accent` (harvest gold), `--color-trust` (navy/slate)
- **Typography:** `--font-heading`, `--font-body` (e.g. Plus Jakarta Sans + Inter via Shopify font picker)
- **Spacing:** 4px scale `--space-1` … `--space-16`
- **Radius:** `--radius-card`, `--radius-button`
- **Motion:** `--transition-fast` (respect `prefers-reduced-motion`)

### 2.3 Section taxonomy

| Group | Sections | Admin purpose |
|-------|----------|---------------|
| **Global** | `header`, `footer`, `announcement-bar`, `sticky-whatsapp-cta` | Site-wide |
| **Home** | 12 homepage sections (see doc 02) | Drag-and-drop homepage |
| **Merchandising** | `featured-collection`, `collection-grid`, `combo-offer`, `flash-sale` | Campaigns |
| **Content** | `rich-text`, `blog-preview`, `testimonials`, `advisory-education` | Trust & SEO |
| **Product** | `main-product`, `product-tabs-metafields`, `related-products` | PDP |
| **Collection** | `collection-banner`, `collection-filters`, `subcollection-nav` | PLP |
| **Utility** | `dealer-enquiry-cta`, `ai-crop-doctor-cta` | Future integration hooks |

---

## 3. Folder structure (theme)

See [`theme/README.md`](../theme/README.md) and [`docs/01-theme-architecture.md`](01-theme-architecture.md).

**Principles:**

- One section per file; blocks for repeatable items (testimonial cards, category tiles)
- Snippets ≤ 150 lines; sections orchestrate
- `src/` for Tailwind source; build outputs to `assets/`
- Prefix snippets: `morbeez-` for project-specific (`morbeez-product-card.liquid`)

---

## 4. Section / component breakdown (summary)

Full spec: [`02-homepage-sections.md`](02-homepage-sections.md).

| Homepage section | Key blocks | Data source |
|------------------|------------|-------------|
| Hero | Slide, CTA, badge | Section settings + optional metaobject |
| Crop categories | Category tile | Manual blocks OR `link_list` |
| Shop by problem | Problem tile | Collection links |
| Featured products | — | `collection` picker |
| Combo offers | Offer card | Collection / product list |
| Testimonials | Quote | Blocks |
| Blog preview | Article card | `blog` picker |
| Seasonal campaign | Banner | Image + link |
| Flash sale | Countdown | Collection + end datetime |
| Advisory education | Card | Page links / blog |
| WhatsApp sticky | Phone, message | Settings (future API ID) |
| AI Crop Doctor CTA | URL placeholder | `page` or external URL setting |
| Dealer enquiry | Form CTA | `page` link |

---

## 5. Homepage implementation structure

`templates/index.json` — ordered section list with **presets** in each section schema for one-click restore.

```json
{
  "sections": {
    "hero": { "type": "hero-premium", "settings": {} },
    "crop_categories": { "type": "crop-categories", "settings": {} },
    "shop_by_problem": { "type": "shop-by-problem", "settings": {} },
    "featured_products": { "type": "featured-collection", "settings": { "collection": "featured" } },
    "combo_offers": { "type": "combo-offer", "settings": {} },
    "seasonal_campaign": { "type": "seasonal-campaign", "settings": {} },
    "flash_sale": { "type": "flash-sale", "settings": {} },
    "advisory_education": { "type": "advisory-education", "settings": {} },
    "testimonials": { "type": "testimonials", "settings": {} },
    "blog_preview": { "type": "blog-preview", "settings": {} },
    "ai_crop_doctor_cta": { "type": "ai-crop-doctor-cta", "settings": {} },
    "dealer_enquiry_cta": { "type": "dealer-enquiry-cta", "settings": {} }
  },
  "order": [
    "hero",
    "crop_categories",
    "shop_by_problem",
    "featured_products",
    "combo_offers",
    "seasonal_campaign",
    "flash_sale",
    "advisory_education",
    "testimonials",
    "blog_preview",
    "ai_crop_doctor_cta",
    "dealer_enquiry_cta"
  ]
}
```

**Sticky WhatsApp** lives in `sections/sticky-whatsapp-cta.liquid` included via `layout/theme.liquid` (not index-only).

---

## 6. Collection architecture (summary)

Full taxonomy: [`03-collection-architecture.md`](03-collection-architecture.md).

### Handle convention

```
/collections/crop-{crop-handle}      e.g. crop-paddy, crop-coconut
/collections/problem-{slug}          e.g. problem-blast, problem-mites
/collections/category-{slug}         e.g. category-fungicide
/collections/ai-{campaign-slug}      placeholder for M3+
/collections/dealer-{tier}           B2B placeholder
```

### Smart vs custom

- **Custom collections** for curated merchandising (Featured, Combos, Flash Sale)
- **Automated collections** for taxonomy (tag rules: `crop:paddy`, `problem:blast`)

### Navigation

- Mega menu Level 1: Shop by Crop | Shop by Problem | Categories | Offers | Learn
- Level 2–3: collection groups from `navigation` menus in Admin

---

## 7. Product metafield structure (summary)

Full definitions: [`04-metafields.md`](04-metafields.md) + [`config/metafields.json`](../config/metafields.json).

Namespaces: `morbeez.*` (custom), standard `descriptors` where applicable.

Core groups: **agronomy**, **usage**, **compatibility**, **SEO/i18n**, **AI mapping** (placeholders).

---

## 8. Recommended Shopify apps (M1)

| App | Purpose | M1 action |
|-----|---------|-----------|
| **Translate & Adapt** (Shopify) | EN + Malayalam | Install, connect Markets |
| **Search & Discovery** | Filters, synonyms | Configure crop/problem filters |
| **Shopify Forms** or **Hulk Form Builder** | Dealer enquiry | Embed on page/section |
| **Judge.me** or **Loox** | Reviews/testimonials | Optional; can use section blocks first |
| **TinyIMG** or **Shopify native** | Image compression | Enable lazy load patterns in theme |
| **Matrixify** | Bulk import | Dev/staging only for taxonomy import |
| **Launchpad** (Plus) or manual | Flash sales | Section-based countdown for M1 |

**Avoid for M1:** Heavy page builders (PageFly), duplicate filter apps, chat apps that conflict with custom WhatsApp CTA.

---

## 9. Theme customization strategy

1. **Theme Editor first** — Every homepage section exposes settings (images, headings, collections, colors within brand tokens).
2. **Presets** — Ship `config/settings_data.json` with demo content for staging.
3. **Metaobjects for repeatable content** — Campaign banners, advisory cards (optional M1, recommended M1 end).
4. **No hardcoded copy in Liquid** — Use `{{ 'sections.hero.title' | t }}` locale keys; default EN in `locales/en.default.json`.
5. **Brand settings** — `config/settings_schema.json` groups: Colors, Typography, Social, WhatsApp, Feature flags (`enable_ai_cta`, `enable_dealer_cta`).

---

## 10. SEO strategy (summary)

Detail: [`06-seo-performance.md`](06-seo-performance.md).

- Unique H1 per template; homepage hero uses semantic `<h1>` once
- Collection descriptions (HTML) + metafield `morbeez.seo_focus_keyword`
- Structured data: `Product`, `BreadcrumbList`, `Organization` via `snippets/schema-*.liquid`
- Blog: Article schema, internal linking from advisory section
- `sitemap.xml` auto; manual `robots.txt` only if needed
- Canonical URLs via Shopify; hreflang when Markets live

---

## 11. Mobile optimization strategy

- **Mobile-first CSS** — Base styles for 360px; `md:` breakpoints for tablet/desktop
- **Touch targets** ≥ 44px; sticky WhatsApp above safe-area inset
- **Image sizes** — `image_url` width param per breakpoint; WebP where Shopify serves
- **Critical CSS** — Inline above-fold hero styles optional (measure first)
- **Defer JS** — Alpine only on components that need interactivity (mega menu, tabs)
- **Font subset** — Limit weights (400, 600, 700)

---

## 12. Future scalability considerations

Detail: [`08-future-scalability.md`](08-future-scalability.md).

| Future capability | M1 hook |
|-------------------|---------|
| WhatsApp Cloud API | `settings.whatsapp_number`, `data-wa-message` attributes, customer metafield plan |
| AI Crop Doctor | CTA section → app proxy URL `/apps/crop-doctor` |
| Supabase profiles | Customer ID in Liquid `customer.id`; metafield `morbeez.external_profile_id` |
| Zoho CRM | Webhook placeholders in docs; form uses Shopify customer + tags |
| Mobile app | Storefront API product handles = theme URLs; metafield API parity |
| Dealer pricing | Customer tags `dealer-tier-a`; collection `dealer-catalog` hidden from D2C |
| AI recommendations | Collection type `ai-*` + product metafield `morbeez.ai_tags` |

---

## 13. Suggested development workflow

```
Shopify Partners → Create dev store
       ↓
GitHub repo (theme + docs)
       ↓
shopify theme init / link
       ↓
Feature branch → theme dev → PR → theme check CI
       ↓
Merge → shopify theme push (staging theme ID)
       ↓
Client UAT on staging → publish to live
```

**Environments:** `development` (CLI dev), `staging` (unpublished theme), `production` (live theme).

**Branch naming:** `feature/M1-hero-section`, `fix/collection-grid-lcp`.

---

## 14. GitHub repository structure

```
morbeez/
├── .github/
│   └── workflows/
│       └── theme-check.yml
├── .shopify/
│   └── project.toml
├── config/
│   └── metafields.json          # Definition export for review
├── docs/                        # This milestone's architecture
├── theme/                       # Shopify theme root
│   ├── assets/
│   ├── config/
│   ├── layout/
│   ├── locales/
│   ├── sections/
│   ├── snippets/
│   ├── templates/
│   └── src/                     # Tailwind source
├── package.json                 # Build scripts (tailwind, theme-check)
└── README.md
```

---

## 15. Implementation roadmap

### Week 1

| Day | Focus | Output |
|-----|-------|--------|
| D1 | Store setup, apps, taxonomy handles | Dev store, menus, empty collections |
| D2 | Theme scaffold, design tokens, header/footer | Nav + mega menu shell |
| D3 | Homepage sections 1–6 | Hero through combos |
| D4 | Homepage sections 7–12 + sticky CTA | Full index.json |
| D5 | PDP metafield tabs, collection templates | Product structure visible |

### Week 2

| Day | Focus | Output |
|-----|-------|--------|
| D6 | Metafield definitions + sample products | 10–20 SKU demo catalog |
| D7 | SEO snippets, performance pass | Schema, lazy load |
| D8 | Malayalam Markets + locale keys | i18n foundation |
| D9 | Admin presets, documentation | Client handoff |
| D10 | UAT, Lighthouse fixes, publish staging | Milestone sign-off |

---

## 16. Task breakdown & priorities

### P0 — Must ship

1. Dev store + GitHub + CLI linked  
2. Theme folder structure + layout + header/footer  
3. All 12 homepage sections + sticky WhatsApp  
4. Collection taxonomy + automated rules  
5. Product metafields installed + PDP display  
6. Mobile navigation + mega menu  
7. Basic SEO (title, meta, schema product)  
8. Theme Editor presets  

### P1 — Should ship

9. Tailwind build pipeline  
10. Blog template + blog preview section  
11. Translate & Adapt wired for ML  
12. Theme Check CI  
13. Flash sale countdown section  

### P2 — Nice to have

14. Metaobject-driven campaigns  
15. Advanced collection filters UI  
16. Dealer enquiry Shopify Form  

---

## 17. Reusable component strategy

| Snippet | Used by |
|---------|---------|
| `morbeez-product-card` | Featured, collection grid, combos, flash sale |
| `morbeez-collection-tile` | Crop categories, shop by problem |
| `morbeez-button` | All CTAs (variants: primary, secondary, whatsapp) |
| `morbeez-section-header` | Title + subtitle + optional link |
| `morbeez-badge` | Sale, New, Organic |
| `morbeez-rating-stars` | Testimonials, PDP |
| `morbeez-icon` | SVG sprite reference |
| `morbeez-lazy-image` | Responsive srcset wrapper |
| `morbeez-schema-product` | PDP JSON-LD |

**Rules:** Snippets accept explicit parameters (`{% render 'morbeez-product-card', product: product, show_vendor: false %}`). No global state. Sections never duplicate card markup.

---

## Document map

All numbered deliverables are expanded in linked docs. The `theme/` directory contains the implementation scaffold for M1 development to continue immediately.
