# Morbeez navigation setup (Katyayani-style)

The theme header supports a **two-tier layout**:

1. **Top bar** — Logo · Search (category + query) · Cart total  
2. **Green nav bar** — Many uppercase menu tabs + **Login** button  

Until menus are created in Shopify Admin, the theme shows **fallback links** (Home, Products, About, Contact, Blog, FAQ).

## Step 1 — Create menus in Shopify Admin

Go to **Content → Menus**.

### Menu: `main-menu` (primary — green bar)

| Menu item | Link | Notes |
|-----------|------|--------|
| Home | `/` | |
| Products | — | Add **child links** (collections) |
| → Bio Fertilizers | `/collections/bio-fertilizers` | |
| → Bio Pesticides | `/collections/bio-pesticides` | |
| → Organic Inputs | `/collections/organic-inputs` | |
| → Water Soluble | `/collections/water-soluble-fertilizers` | |
| Our Initiatives | `/pages/our-initiatives` | Create page first |
| Careers | `/pages/careers` | |
| About Us | `/pages/about-us` | |
| Contact Us | `/pages/contact` | |
| Blog | `/blogs/news` | Create blog if needed |
| Shop | `/collections/all` | |
| FAQ / Need Help? | `/pages/faq` | |

Assign this menu in **Theme customize → Header → Main navigation menu**.

### Menu: `footer` (optional utility — mobile drawer “More links”)

| Item | Link |
|------|------|
| Dealer enquiry | `/pages/dealer-enquiry` |
| Crop Doctor | `/pages/crop-doctor` |
| Privacy policy | `/policies/privacy-policy` |

Assign in **Header → Secondary menu (mobile)**.

## Step 2 — Assign menu to theme

1. **Online Store → Themes → Customize**  
2. **Header** section  
3. **Main navigation menu** → select `main-menu`  
4. Enable **Show login button**  
5. **Save**

## Step 3 — Homepage sections

After `theme push`, the homepage includes:

- **Hero carousel** — upload farmer/agri images per slide  
- **Quick category bar** — horizontal chips to collections  
- Shop by crop / problem, featured products, combos, etc.

Reorder or disable sections in the theme editor.

## Step 4 — Pages to create

Create these **Pages** in Admin so menu links work:

- `about-us`, `contact`, `faq`, `careers`, `our-initiatives`, `dealer-enquiry`, `crop-doctor`

## Step 5 — Currency (India)

**Settings → General → Store currency → Indian Rupee (INR)**  

Theme setting: **India / currency → Show prices with ₹**

## Deploy

```powershell
npm run build:css
npm run theme:push
```
