# Morbeez storefront — client setup checklist

Functional theme pieces are in the repo. Shopify Admin still needs products, menus, and pages for everything to appear live.

## 1. Theme deploy

```powershell
cd "E:\task\india(kata)"
npm run build:css
npm run theme:push
```

Target theme ID is pinned in `theme/shopify.theme.toml` (Development theme `157069279431`).

**If you see many “Failed to delete … could not be deleted” errors:** you likely ran `shopify theme push` without `--path theme`, or pushed to the **live** Morbeez theme from the interactive menu. Use `npm run theme:push` instead (uploads only, does not delete remote files). Preview: `https://morbeez.myshopify.com?preview_theme_id=157069279431`. To update the live storefront: `npm run theme:push:live`, then publish that theme in Admin.

## 2. Products & collections

1. Generate catalog (optional refresh):
   ```powershell
   npm run catalog:generate
   npm run catalog:export-shopify
   ```
2. **Shopify Admin → Products → Import** → `config/shopify-products-import.csv`
3. Create collections matching handles used on the homepage:
   - `bio-fertilizers`, `bio-pesticides`, `organic-inputs`, `micronutrients`, `plant-growth-regulators`, `combo-offers`
4. For **bestsellers**: create a collection (e.g. “Bestsellers”) sorted by best-selling, then set **Homepage → Our bestsellers** section to that collection in the theme editor.

## 3. Navigation (main menu)

**Admin → Content → Menus → main-menu** — suggested structure:

| Top link | URL / children |
|----------|----------------|
| Home | `/` |
| Products | `/collections/all` |
| Bio Fertilizers | `/collections/bio-fertilizers` |
| Bio Pesticides | `/collections/bio-pesticides` |
| Crop Doctor | `/pages/crop-doctor` |
| Dealers | `/pages/dealer-enquiry` |
| About | `/pages/about-us` |
| Contact | `/pages/contact` |
| Blog | `/blogs/news` (or your blog handle) |

Until menus exist, the theme shows **built-in fallback links** in the header and footer.

See also: [SHOPIFY-NAVIGATION-SETUP.md](./SHOPIFY-NAVIGATION-SETUP.md)

## 4. Farmer website login (not Shopify accounts)

1. Run Supabase migration: `supabase/migrations/20260524000000_farmer_website_auth.sql`
2. Set `FARMER_JWT_SECRET` in backend `.env` (min 32 characters)
3. Create page **Login** with handle `login` and template `page.login`
4. App proxy must route `/apps/morbeez/*` to your API (same as Crop Doctor)
5. Header **Login** button points to `/pages/login` — farmer data is stored in the `farmers` table (email, name, terms, newsletter, password hash)

## 5. Pages

Create pages in Admin (handle → template):

| Page | Handle | Template |
|------|--------|----------|
| Login | `login` | `page.login` |
| About us | `about-us` | `page.about` |
| Contact | `contact` | `page.contact` |
| FAQ | `faq` | `page.faq` |
| Crop Doctor | `crop-doctor` | `page.crop-doctor` |
| Dealer enquiry | `dealer-enquiry` | `page.dealer-enquiry` |
| Careers | `careers` | default `page` |
| Initiatives | `initiatives` | default `page` |

## 6. Theme settings

**Theme customize → Theme settings:**

- **Brand** — logo, Morbeez green `#34B35E`
- **Store contact & social** — address, phone, email, social URLs
- **WhatsApp** — number for header/footer/Crop Doctor CTAs
- **India / currency** — enable ₹ display; set store currency to **INR** in Admin → Settings → General

**Footer section:**

- Navigate + Product categories blocks (fallback links work if menus are empty)
- Contact column — fill phone/email or use global store contact settings

## 7. Reviews (optional)

Install **Shopify Product Reviews** or **Judge.me**. Star ratings show automatically when `product.metafields.reviews.rating` is set. Product page has an **@app** block area for the reviews widget.

## 8. Newsletter

Homepage includes a newsletter section (Shopify customer tag `newsletter`). Confirm **Settings → Customer privacy** allows marketing opt-in if required in your region.

## 9. Backend (Crop Doctor, payments, shipping)

Deploy `backend/` with Supabase migrations and env vars. Configure:

- App proxy for Crop Doctor / dealer APIs
- Razorpay, Shiprocket, WhatsApp webhooks per `backend/README` (if present)

## 10. Go live

1. Publish the Morbeez theme (not `test-data` unless intentional).
2. Spot-check: search, collection filters, cart/checkout INR, contact form, mobile menu, footer columns.
