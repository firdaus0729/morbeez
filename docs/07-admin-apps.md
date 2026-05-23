# 07 — Admin, Apps & Customization Strategy

## Admin-first design goals

A store operator with **no Liquid knowledge** should:

- Swap homepage hero and campaigns from Theme Editor  
- Add products with metafields via guided Admin UI  
- Assign products to collections via tags (automated)  
- Publish blog advisory posts  
- Toggle seasonal sections on/off

---

## Theme settings (`config/settings_schema.json`)

### Brand

- Primary / secondary / accent colors  
- Logo, favicon, footer logo  
- Border radius preset (sharp / rounded)

### Typography

- Heading font picker  
- Body font picker  
- Base font size scale

### Contact & social

- Phone, email, address  
- Instagram, YouTube, Facebook URLs

### WhatsApp

- Business phone (E.164)  
- Default chat message template  
- Enable sticky CTA

### Feature flags

| Setting | Default | Purpose |
|---------|---------|---------|
| `enable_ai_crop_doctor_cta` | true | Show section (links to placeholder) |
| `enable_dealer_enquiry` | true | |
| `enable_flash_sale_section` | false | Seasonal toggle |
| `show_trust_badges` | true | |

### SEO defaults

- Title suffix: `| Morbeez`  
- Default OG image  
- Organization name for schema

---

## Section management guide (client doc excerpt)

| To change… | Go to… |
|------------|--------|
| Homepage hero | Customize → Home → Hero Premium |
| Crop tiles | Home → Crop categories → blocks |
| Featured products | Home → Featured collection → pick collection |
| Flash sale | Home → Flash sale → collection + end date |
| Header menu | Navigation → main-menu |
| Collection images | Products → Collections → [name] |
| Product dosage | Products → [SKU] → Metafields |

---

## Recommended Shopify apps

### Essential (M1)

| App | Cost tier | Function |
|-----|-----------|----------|
| [Translate & Adapt](https://apps.shopify.com/translate-and-adapt) | Free–paid | ML translation |
| [Search & Discovery](https://apps.shopify.com/search-and-discovery) | Free | Filters, boost |
| [Shopify Forms](https://apps.shopify.com/shopify-forms) | Free | Dealer enquiry |

### Strongly recommended

| App | Function |
|-----|----------|
| Judge.me / Loox | Reviews (sync with testimonials section later) |
| TinyIMG / Crush.pics | Compression audit |
| Matrixify | Bulk product + metafield import (dev only) |

### Later milestones

| App | Milestone |
|-----|-----------|
| WATI / Interakt | M2 WhatsApp |
| Zoho CRM connector / custom app | M3 |
| Recharge / subscriptions | If subscription SKUs |
| Shopify B2B | Dealer pricing M4 |

### Apps to avoid M1

- Page builders (PageFly, GemPages) — conflicts with custom sections  
- Duplicate search apps  
- Heavy popup apps (hurts CWV)  
- Multi-currency apps (use Markets)

---

## Content governance

| Content type | Owner | Review |
|--------------|-------|--------|
| Agronomy copy | Agronomist | Before publish |
| Malayalam | Native translator | Before ML market live |
| Campaign banners | Marketing | Theme Editor preview |
| Blog | Advisory team | SEO checklist |

---

## Staging vs production

| Environment | Theme | Catalog |
|-------------|-------|---------|
| Development | CLI dev theme | Test products |
| Staging | Unpublished duplicate | Copy of production |
| Live | Published | Real SKUs |

**Never** edit live theme directly; use duplicate + publish.

---

## Backup & rollback

- Theme versions: Shopify auto-saves; download ZIP before major changes  
- Products: Matrixify export weekly  
- `settings_data.json` in Git after each release tag
