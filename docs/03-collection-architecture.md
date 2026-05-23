# 03 — Collection & Product Taxonomy

## Taxonomy dimensions

Morbeez merchandising uses **four orthogonal axes** (product can belong to multiple):

1. **Crop** — what it protects or nourishes  
2. **Problem** — disease, pest, deficiency  
3. **Category** — product type (fungicide, insecticide, fertilizer, bio, equipment)  
4. **Campaign** — seasonal, flash, combo, AI-curated (future)

## Tag convention (automated collections)

Machine-readable tags for rules engine:

```
crop:paddy
crop:coconut
crop:vegetables-tomato
problem:blast
problem:mites
problem:nutrient-deficiency
category:fungicide
category:bio-stimulant
ai:recommended-monsoon
dealer:tier-a-only
locale:ml-ready
```

**Human-readable title tags** optional; prefer metafields over tag sprawl for structured data.

---

## Collection catalog (seed list)

### Crop-wise (`/collections/crop-*`)

| Handle | Title (EN) | Automation rule |
|--------|------------|-----------------|
| crop-paddy | Paddy | Product tag equals `crop:paddy` |
| crop-coconut | Coconut | `crop:coconut` |
| crop-vegetables | Vegetables | tag contains `crop:vegetables` |
| crop-plantation | Plantation Crops | |
| crop-fruits | Fruits | |
| crop-spices | Spices | |
| crop-flowers | Flowers & Ornamentals | |

Add regional crops as business expands; keep handles **English**, titles translatable via Markets.

### Problem-wise (`/collections/problem-*`)

| Handle | Title (EN) |
|--------|------------|
| problem-fungal-diseases | Fungal Diseases |
| problem-bacterial-diseases | Bacterial Diseases |
| problem-sucking-pests | Sucking Pests |
| problem-chewing-pests | Chewing Pests |
| problem-mites | Mites |
| problem-nutrient-deficiency | Nutrient Deficiency |
| problem-growth-promotion | Growth & Yield |

### Category-wise (`/collections/category-*`)

| Handle | Title (EN) |
|--------|------------|
| category-fungicides | Fungicides |
| category-insecticides | Insecticides |
| category-herbicides | Herbicides |
| category-fertilizers | Fertilizers & Micronutrients |
| category-bio-products | Bio & Organic |
| category-growth-regulators | Plant Growth Regulators |
| category-combos | Combo Packs |

### Campaign / merchandising (manual)

| Handle | Type |
|--------|------|
| featured | Custom — hand-picked |
| combos | Custom |
| flash-sale | Custom — linked from flash-sale section |
| season-monsoon-2026 | Custom — rotated quarterly |
| new-arrivals | Automated — created last 30 days |
| best-sellers | Automated — by sales when data exists |

### Future placeholders

| Handle | Purpose |
|--------|---------|
| ai-monsoon-kit-2026 | AI recommendation landing |
| dealer-catalog | B2B; hide from D2C nav via theme logic + customer tags |
| dealer-tier-a-pricing | Customer-specific pricing M4+ |

---

## Navigation structure

### Main menu (Shopify Navigation: `main-menu`)

```
Shop by Crop          → mega menu → crop collections
Shop by Problem       → mega menu → problem collections
Products              → category collections
Offers                → featured, combos, flash-sale
Learn                 → blog, advisory pages
Dealer                → dealer enquiry page (footer too)
```

### Footer menu

- About, Contact, Shipping policy (placeholder), Privacy, Terms  
- WhatsApp support link  
- Regional language switcher (Markets selector snippet)

### Mega menu structure

```
[L1 Crop]     [L1 Problem]     [L1 Products]
  ├─ Paddy      ├─ Fungal         ├─ Fungicides
  ├─ Coconut    ├─ Pests          ├─ Insecticides
  └─ View all   └─ View all       └─ ...
```

Implemented via **3 link lists** + `snippets/morbeez-mega-menu.liquid`, not hardcoded URLs.

---

## Product taxonomy (types & options)

### Product types (Shopify `product.type`)

Align with `category:*` tags for reporting.

### Options (variants)

Typical ag SKUs:

- **Pack size** — 100ml, 250ml, 1L, 1kg  
- **Unit** — if multiple units per product  

Variant metafields (optional): `morbeez.dosage_per_pack` for pack-specific dosage.

---

## PLP (collection page) features M1

- Collection banner (image + description from Admin)  
- Subcollection chips if parent/child menus defined  
- Sort: featured, price, newest  
- Filters via **Search & Discovery** (crop, problem, category metafields as facets when configured)  
- SEO text block at bottom (collapsible on mobile)

---

## AI recommendation collections (M3 prep)

Create empty collections with handles `ai-*` and description "Curated by Crop Doctor — coming soon."

Products carry metafield `morbeez.ai_recommendation_tags` (list) for future automated fills via backend.

---

## Dealer pricing workflow (M4 prep)

| Mechanism | M1 action |
|-----------|-----------|
| Customer tags | Document: `dealer`, `dealer-tier-a` |
| Collection visibility | `dealer-catalog` excluded from public menus; link only when `customer.tags contains 'dealer'` |
| Price lists | Shopify B2B / Plus — document only for M1 |

---

## Import workflow (staging)

1. Export taxonomy CSV (handles, titles, rules)  
2. Import products via Matrixify with tags + metafields columns  
3. Assign menu links in Navigation  
4. Verify automated collection counts

See [`config/collections-seed.csv`](../config/collections-seed.csv).
