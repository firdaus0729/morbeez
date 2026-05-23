# 01 — Theme Architecture & Folder Structure

## Base theme strategy

**Do not** ship a bloated third-party theme. **Do** use Shopify Online Store 2.0 conventions proven in Dawn:

- JSON templates
- Section groups (`header-group`, `footer-group`)
- App blocks support in `main-product` and footer
- Native cart drawer pattern

**Morbeez theme name:** `morbeez-ag` (internal handle)

## Complete folder structure

```
theme/
├── assets/
│   ├── theme.css                 # Compiled Tailwind + custom
│   ├── theme.js                  # Minimal entry (mega menu, tabs)
│   ├── alpine.min.js             # Optional vendor copy or CDN defer
│   └── *.svg                     # Icons not suitable for sprite
├── config/
│   ├── settings_schema.json      # Brand, WhatsApp, feature flags
│   └── settings_data.json        # Default preset (staging)
├── layout/
│   ├── theme.liquid              # HTML shell, sections, sticky CTA
│   └── password.liquid
├── locales/
│   ├── en.default.json
│   └── ml.json                   # Malayalam (when Markets active)
├── sections/
│   ├── header-group.json
│   ├── footer-group.json
│   ├── announcement-bar.liquid
│   ├── header.liquid
│   ├── footer.liquid
│   ├── sticky-whatsapp-cta.liquid
│   # Homepage
│   ├── hero-premium.liquid
│   ├── crop-categories.liquid
│   ├── shop-by-problem.liquid
│   ├── featured-collection.liquid
│   ├── combo-offer.liquid
│   ├── seasonal-campaign.liquid
│   ├── flash-sale.liquid
│   ├── advisory-education.liquid
│   ├── testimonials.liquid
│   ├── blog-preview.liquid
│   ├── ai-crop-doctor-cta.liquid
│   ├── dealer-enquiry-cta.liquid
│   # Catalog
│   ├── main-product.liquid
│   ├── main-collection.liquid
│   ├── collection-banner.liquid
│   ├── main-blog.liquid
│   ├── main-article.liquid
│   └── main-page.liquid
├── snippets/
│   ├── css-variables.liquid
│   ├── morbeez-product-card.liquid
│   ├── morbeez-collection-tile.liquid
│   ├── morbeez-button.liquid
│   ├── morbeez-section-header.liquid
│   ├── morbeez-badge.liquid
│   ├── morbeez-lazy-image.liquid
│   ├── morbeez-icon.liquid
│   ├── morbeez-mega-menu.liquid
│   ├── morbeez-mobile-drawer.liquid
│   ├── morbeez-product-tabs.liquid
│   ├── schema-product.liquid
│   ├── schema-organization.liquid
│   └── meta-tags.liquid
├── templates/
│   ├── index.json
│   ├── product.json
│   ├── collection.json
│   ├── list-collections.json
│   ├── blog.json
│   ├── article.json
│   ├── page.json
│   ├── page.dealer-enquiry.json
│   └── customers/
├── src/
│   ├── tailwind.css              # @tailwind directives
│   └── components/               # @layer components (cards, buttons)
└── README.md
```

## Section schema conventions

Every section includes:

```liquid
{% schema %}
{
  "name": "t:sections.hero_premium.name",
  "tag": "section",
  "class": "section-hero-premium",
  "settings": [
    { "type": "header", "content": "t:sections.hero_premium.settings.header_content" }
  ],
  "blocks": [],
  "presets": [{ "name": "t:sections.hero_premium.presets.default" }]
}
{% endschema %}
```

- Translation keys in `locales/*.json` — **never** user-facing English in schema `name` fields without `t:` prefix
- `disabled_on` / `enabled_on` where sections are template-specific
- `limit: 1` for global sections when applicable

## Layout responsibilities

`layout/theme.liquid`:

1. `<head>`: `meta-tags`, preconnect, `theme.css`, deferred `theme.js`
2. `{% sections 'header-group' %}`
3. `{{ content_for_layout }}`
4. `{% sections 'footer-group' %}`
5. `{% section 'sticky-whatsapp-cta' %}` — global, outside groups for z-index control

## Tailwind integration

**Build (repo root):**

```json
{
  "scripts": {
    "dev:css": "tailwindcss -i ./theme/src/tailwind.css -o ./theme/assets/theme.css --watch",
    "build:css": "tailwindcss -i ./theme/src/tailwind.css -o ./theme/assets/theme.css --minify"
  }
}
```

`tailwind.config.js` — `content: ['./theme/**/*.{liquid,json,js}']`

**Safelist** dynamic classes used in metafield-driven badges if any.

**Do not** load Tailwind CDN in production.

## Alpine.js usage (minimal)

| Component | Alpine directive | Why |
|-----------|------------------|-----|
| Mega menu | `x-data="{ open: false }"` | Keyboard + hover hybrid |
| Mobile drawer | `x-show`, focus trap | UX |
| Product tabs | `x-data="{ tab: 'dosage' }"` | PDP metafield tabs |
| Flash sale countdown | `x-data` + interval | Client-side end time |

Load Alpine with `defer` only on templates that need it, or bundle in `theme.js` with tree-shaking if size allows.

## Performance guardrails

- Max 2 webfont families, 3 weights total
- Section CSS: prefer utilities in compiled CSS over `{% style %}` per section (exception: dynamic hero background image)
- Images: always `loading="lazy"` except first hero `fetchpriority="high"`
- No jQuery

## App block compatibility

In `main-product.liquid` and `footer.liquid`:

```liquid
{% for block in section.blocks %}
  {% case block.type %}
    {% when '@app' %}
      {% render block %}
  {% endcase %}
{% endfor %}
```

Ensures future review apps and WhatsApp widgets can inject without theme edits.
