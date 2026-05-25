# Morbeez Product Master Catalog

Professional agriculture product master catalog for Shopify import, Google SEO, and Morbeez AI recommendation tagging.

## Files

| File | Purpose |
|------|---------|
| `config/morbeez-product-master-catalog.csv` | **Master catalog** (307 SKUs, Shopify-ready) |
| `scripts/generate-product-catalog.mjs` | Regenerate or extend catalog |

## Why the script does not change the website UI

`generate-product-catalog.mjs` only writes a **local file** on your computer:

`config/morbeez-product-master-catalog.csv`

The Shopify storefront **does not read this file**. The theme shows products from **Shopify Admin → Products** and **Collections** you assign in the theme editor. Until you import products, collection grids stay empty even if the CSV exists.

## Regenerate master catalog

```powershell
cd E:\task\india(kata)
npm run catalog:generate
```

## Push products to Shopify (required for UI)

```powershell
npm run catalog:export-shopify
```

This creates `config/shopify-products-import.csv` (Shopify import format with size variants).

1. Shopify Admin → **Products** → **Import**
2. Upload `config/shopify-products-import.csv`
3. Online Store → **Themes** → **Customize** → assign collections on **Featured collection**, **Crop categories**, etc.

## Catalog scope (11 categories)

| Main Category | SKU count |
|---------------|-----------|
| Bio Fertilizers | 47 |
| Bio Pesticides | 35 |
| Organic Inputs | 27 |
| Water Soluble Fertilizers | 34 |
| Micronutrients | 32 |
| Chemical Fungicides | 21 |
| Chemical Insecticides | 20 |
| Plant Growth Regulators | 13 |
| Herbicides | 13 |
| Specialty Products | 14 |
| Crop Special Products | 51 |
| **Total** | **307** |

## Morbeez label line (from client artwork)

Core **M** products extracted from product labels (own trademarks):

- M TRIAC, M NEMA, M SEA, M ORTHO, M NPK+, M VAM, M CALSOL, M Z-ZOL, M SUBTIL, M K-MOB, M PSEUDO, M TRICHO
- Plus 500ml, 5L, 10L pack variants and Morbeez combo kits

All other SKUs use **trademark-safe internal names** (no competitor trade names).

## Columns (client spec + Shopify fields)

| Column | Notes |
|--------|--------|
| Product Trade Name | Display title |
| Technical Name | Generic / active ingredient |
| Main Category / Sub Category / Product Type | Collection mapping |
| 500g/ml – 25kg/L Rate (INR) | Indian market price ladder |
| SEO Optimized Detailed Description | 60–120 words, unique per SKU |
| Benefits | 4–8 comma-separated points |
| Suitable Crops | Ginger, banana, pepper, cardamom, etc. |
| Application Method | Foliar, drip, soil, seed treatment, etc. |
| Dosage Per 200L Water | Spray tank standard |
| Keywords/Tags | SEO + Shopify tags |
| Shopify Handle | URL slug |
| Recommendation Tags | AI / `ginger.json` rules |

## Shopify import mapping

| Master column | Shopify field |
|---------------|---------------|
| Product Trade Name | Title |
| SEO Optimized Detailed Description | Body (HTML) |
| Shopify Handle | Handle |
| 1kg/L Rate (INR) | Variant price (add variants per pack column) |
| Keywords/Tags | Tags |
| Main Category | Product type or collection |
| Suitable Crops | Metafield `morbeez.suitable_crops` |
| Dosage Per 200L Water | Metafield `morbeez.dosage_200l` |
| Recommendation Tags | Metafield `morbeez.recommendation_tags` |

## Import steps

1. Run `node scripts/generate-product-catalog.mjs`
2. Open `config/morbeez-product-master-catalog.csv` in Excel or Google Sheets
3. Map columns to Shopify Product CSV (or use Matrixify / Store Importer)
4. Upload product images from label artwork per handle (e.g. `m-triac`, `m-nema`)
5. Assign collections by **Main Category**

## Rules applied

- No competitor trade names — generic technical names + Morbeez **M** line only
- Unique SEO descriptions per SKU
- Realistic Indian INR pricing and 200 L spray dosages
- Compatible with drip, foliar, and organic program mentions
