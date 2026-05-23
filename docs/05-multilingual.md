# 05 — Multilingual Foundation

## Languages

| Phase | Language | Channel |
|-------|----------|---------|
| M1 | English (default) | Full storefront |
| M1 | Malayalam | Markets + Translate & Adapt |
| M2+ | Tamil, Kannada, Hindi | Same architecture |

## Core rule

**No language-specific Liquid branches.**

```liquid
{# ❌ NEVER #}
{% if request.locale.iso_code == 'ml' %}
  <h1>നിങ്ങളുടെ വിള</h1>
{% else %}
  <h1>Your crop</h1>
{% endif %}

{# ✅ ALWAYS #}
<h1>{{ 'sections.hero.heading' | t }}</h1>
```

Product-specific agronomy copy comes from **translated metafields** or Markets product translations—not duplicated templates.

---

## Architecture layers

```
┌─────────────────────────────────────────┐
│ Shopify Markets (domains/subfolders)     │
│  en-IN default, ml-IN market             │
└─────────────────┬───────────────────────┘
                  │
┌─────────────────▼───────────────────────┐
│ Translate & Adapt (theme + products)     │
└─────────────────┬───────────────────────┘
                  │
┌─────────────────▼───────────────────────┐
│ Theme locales (en.default.json, ml.json) │
│  UI chrome only: buttons, nav labels      │
└─────────────────┬───────────────────────┘
                  │
┌─────────────────▼───────────────────────┐
│ Product/Collection translations (Admin)  │
│  titles, descriptions, metafields        │
└─────────────────────────────────────────┘
```

---

## Theme locale files

- `locales/en.default.schema.json` — Theme Editor labels  
- `locales/en.default.json` — Customer-facing UI strings  
- `locales/ml.json` — Malayalam UI strings (professional translation required)

**Key naming:**

```
sections.hero_premium.heading
products.tabs.dosage
general.whatsapp.contact
collections.filters.apply
```

Use `| t` with interpolation for dynamic values:

```json
"products": {
  "pack_size": "{{ size }} pack"
}
```

```liquid
{{ 'products.pack_size' | t: size: product.metafields.morbeez.pack_size_label }}
```

---

## URL strategy

| Option | Recommendation |
|--------|----------------|
| Subfolders | `morbeez.com/ml/` — good for SEO |
| Domains | `ml.morbeez.com` — if brand requires |

Configure in **Markets**; theme uses `routes.root_url` and `localization` form for switcher.

**Snippet:** `morbeez-language-switcher.liquid` — `{% form 'localization' %}` native.

---

## Content translation workflow

1. Author master content in **English** (Admin)  
2. Export/import via Translate & Adapt or Matrixify for bulk ML  
3. Review agronomy terms with domain expert (Malayalam ag vocabulary)  
4. Publish market when ≥ 80% critical paths translated (PDP, cart, checkout)

---

## Metafield translation

Shopify supports **translatable metafields** when registered with `translatable: true` in definition (API).

Priority translatable metafields:

- `morbeez.dosage_instructions`
- `morbeez.benefits`
- `morbeez.precautions`
- `morbeez.faq`

Until enabled, temporary `morbeez.ml_*` fields documented in metafields doc—**remove after migration**.

---

## RTL / script

Malayalam, Tamil, Kannada, Hindi are LTR—no RTL CSS required.

**Font stack:** Ensure body font has Malayalam glyphs (Noto Sans Malayalam fallback in `css-variables`).

```css
--font-body: "Plus Jakarta Sans", "Noto Sans Malayalam", system-ui, sans-serif;
```

---

## Future app / API

Mobile app and WhatsApp bots should consume **locale parameter** (`?locale=ml`) aligned with Markets ISO codes.

Store farmer preference in `morbeez.preferred_language` customer metafield (M3).

---

## M1 checklist

- [ ] Markets created: India EN + India ML  
- [ ] Translate & Adapt installed  
- [ ] `ml.json` scaffold with homepage + nav keys  
- [ ] Language switcher in header  
- [ ] No hardcoded language in Liquid (theme check custom rule recommended)
