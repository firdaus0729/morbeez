# 04 — Product & Store Metafield Structure

## Namespace strategy

| Namespace | Owner | Purpose |
|-----------|-------|---------|
| `morbeez` | Custom definitions | Agronomy, usage, AI hooks |
| `custom` | Shopify standard | Avoid; use morbeez for clarity |
| `shopify` | Platform | Do not override |

**Rule:** All custom definitions use namespace `morbeez` and snake_case keys.

---

## Product metafields

### Agronomy & targeting

| Key | Type | Storefront use |
|-----|------|----------------|
| `morbeez.target_crops` | list.single_line_text_field | Chips on PDP, filters |
| `morbeez.target_diseases` | list.single_line_text_field | Problem mapping |
| `morbeez.target_pests` | list.single_line_text_field | |
| `morbeez.suitable_stages` | list.single_line_text_field | e.g. vegetative, flowering |
| `morbeez.benefits` | multi_line_text_field | Tab content |
| `morbeez.mode_of_action` | single_line_text_field | Technical tab |

### Usage & safety

| Key | Type | Storefront use |
|-----|------|----------------|
| `morbeez.dosage_instructions` | rich_text_field | Dosage tab |
| `morbeez.application_method` | multi_line_text_field | |
| `morbeez.waiting_period_days` | number_integer | Safety highlight |
| `morbeez.precautions` | rich_text_field | |
| `morbeez.compatibility` | rich_text_field | Compatibility tab |
| `morbeez.incompatible_with` | list.single_line_text_field | |

### Composition

| Key | Type | Storefront use |
|-----|------|----------------|
| `morbeez.active_ingredients` | rich_text_field | Technical tab |
| `morbeez.technical_composition` | rich_text_field | |
| `morbeez.formulation` | single_line_text_field | e.g. WP, EC |

### Content & support

| Key | Type | Storefront use |
|-----|------|----------------|
| `morbeez.faq` | json | `[{ "q": "", "a": "" }]` rendered in FAQ tab |
| `morbeez.pack_size_label` | single_line_text_field | Card subtitle if not in variant |
| `morbeez.video_url` | url | Embed in PDP |

### SEO

| Key | Type | Storefront use |
|-----|------|----------------|
| `morbeez.seo_focus_keyword` | single_line_text_field | Internal; optional title hint |
| `morbeez.search_synonyms` | list.single_line_text_field | Search & Discovery sync |

### Multilingual (foundation)

| Key | Type | Storefront use |
|-----|------|----------------|
| `morbeez.content_locale` | single_line_text_field | `en`, `ml` — source locale of master content |
| `morbeez.ml_title` | single_line_text_field | **Transition:** until full Markets metafield translation |
| `morbeez.ml_short_description` | multi_line_text_field | |

**M1 recommendation:** Prefer Shopify Markets + Translate & Adapt for storefront strings; use `morbeez.ml_*` only for product copy not yet in translation app.

### AI & integration (placeholders)

| Key | Type | Future use |
|-----|------|------------|
| `morbeez.ai_product_slug` | single_line_text_field | Supabase / model mapping |
| `morbeez.ai_recommendation_tags` | list.single_line_text_field | Recommendation engine |
| `morbeez.symptom_keywords` | list.single_line_text_field | Crop Doctor matching |
| `morbeez.external_crm_id` | single_line_text_field | Zoho SKU id |

---

## Collection metafields

| Key | Type | Use |
|-----|------|-----|
| `morbeez.collection_type` | single_line_text_field | crop \| problem \| category \| campaign \| ai |
| `morbeez.icon` | file_reference | Tile image override |
| `morbeez.seo_body` | rich_text_field | Supplement description |
| `morbeez.featured_guide_url` | url | Link to advisory article |

---

## Customer metafields (future)

| Key | Type | Use |
|-----|------|-----|
| `morbeez.farmer_profile_id` | single_line_text_field | Supabase UUID |
| `morbeez.preferred_language` | single_line_text_field | ml, en, ta |
| `morbeez.whatsapp_opt_in` | boolean | Compliance |
| `morbeez.district` | single_line_text_field | Localization |
| `morbeez.primary_crops` | list.single_line_text_field | Personalization |

---

## Metaobjects (recommended M1 end)

### `morbeez.campaign_banner`

| Field | Type |
|-------|------|
| title | single_line |
| image | file |
| link | url |
| start_date / end_date | date |
| season | single_line |

### `morbeez.advisory_card`

| Field | Type |
|-------|------|
| title | single_line |
| excerpt | multi_line |
| article | article_reference |
| crop_tags | list |

Sections reference metaobject entries instead of duplicating images in section blocks.

---

## PDP tab mapping

`snippets/morbeez-product-tabs.liquid`:

| Tab ID | Source |
|--------|--------|
| description | `product.description` |
| dosage | `morbeez.dosage_instructions` |
| benefits | `morbeez.benefits` |
| compatibility | `morbeez.compatibility` |
| technical | composition + formulation + MOA |
| faq | `morbeez.faq` JSON |

Hide empty tabs automatically.

---

## Installation

Use Shopify Admin → Settings → Custom data, or CLI:

```bash
shopify app deploy  # if using app for definitions
```

Or import definitions from [`config/metafields.json`](../config/metafields.json) via Admin API script (M1 dev task).

---

## Governance

- Document every new metafield in this file before creation  
- Never delete keys without migration plan  
- Version breaking changes in `docs/CHANGELOG-METAFIELDS.md`
