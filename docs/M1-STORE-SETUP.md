# Morbeez M1 — Shopify Store Setup Checklist

Complete these steps in the **morbeez** dev store after theme sync.

## 1. Navigation (Online Store → Navigation)

Create **Main menu** (`main-menu`):

| Top level | Child links (examples) |
|-----------|------------------------|
| Shop by Crop | Paddy, Coconut, Vegetables → link to `crop-*` collections |
| Shop by Problem | Fungal diseases, Pests, Mites → `problem-*` collections |
| Products | Fungicides, Insecticides, Bio products |
| Offers | Featured, Combos, Flash sale |
| Learn | Blog: Advisory |

Create **Footer menu** (`footer`): About, Contact, Privacy, Shipping.

## 2. Collections

Import handles from [`config/collections-seed.csv`](../config/collections-seed.csv).

**Automated collection rules** (example):

- Paddy: product tag equals `crop:paddy`
- Fungicides: product tag equals `category:fungicide`

**Manual collections:** `featured`, `combos`, `flash-sale`

## 3. Metafields

**Automated (recommended):**

```powershell
copy ..\.env.example ..\.env
# Add SHOPIFY_STORE and SHOPIFY_ADMIN_API_ACCESS_TOKEN
cd ..
npm run setup:m1
```

**Manual:** Admin → Settings → Custom data → add definitions from [`config/metafields.json`](../config/metafields.json).

Minimum for demo PDP: `morbeez.dosage_instructions`, `morbeez.benefits`, `morbeez.target_crops`.

## 4. Theme Editor (Homepage)

1. Online Store → Themes → Customize  
2. Home page — verify all sections appear in order  
3. **Crop categories** — assign collections to each tile  
4. **Featured collection** — pick `featured` or `all`  
5. **Sticky WhatsApp** — set phone: `91XXXXXXXXXX` (no +)  
6. **Flash sale** — set end datetime ISO: `2026-12-31T23:59:59`

## 5. Pages

| Handle | Purpose |
|--------|---------|
| `crop-doctor` | AI placeholder (link from CTA section) |
| `dealer-enquiry` | Dealer form (Shopify Forms embed in page content) |

Assign template `page.dealer-enquiry` if using dealer section on page.

## 6. Blog

Create blog handle: `advisory` — add 2–3 sample articles for blog preview section.

## 7. Markets (multilingual)

1. Settings → Markets → add **India** with Malayalam when ready  
2. Install **Translate & Adapt**  
3. Language switcher appears when 2+ languages are active

## 8. Apps (M1)

- Search & Discovery — enable filters on crop/problem tags  
- Shopify Forms — dealer enquiry  
- Translate & Adapt — EN + ML

## 9. Sample products

Add 10–20 products with:

- Tags: `crop:paddy`, `problem:mites`, `category:fungicide`  
- Metafields filled for dosage + benefits  
- Images optimized (≤ 200KB where possible)

## 10. Verify

- [ ] Homepage loads on mobile (http://127.0.0.1:9292)  
- [ ] Mega menu / mobile drawer works  
- [ ] PDP tabs show metafield content  
- [ ] Collection page lists products  
- [ ] Cart checkout reaches Shopify checkout  
- [ ] No CLI errors for `gift_card.liquid` or `password.json`
