# 06 — SEO & Performance Foundation

## SEO architecture

### Template-level

| Template | H1 source | Meta description |
|----------|-----------|------------------|
| Home | Hero section setting | Theme setting or page description |
| Collection | `collection.title` | `collection.description` truncated |
| Product | `product.title` | `product.description` or metafield |
| Article | `article.title` | `article.excerpt` |
| Page | `page.title` | `page.content` strip |

**Snippet:** `snippets/meta-tags.liquid` — canonical, og:image, twitter:card.

### Collection SEO structure

- Unique intro copy 150–300 words (Admin description) — **not** keyword stuffing  
- `morbeez.seo_body` metafield for extended farmer education content below fold  
- Breadcrumbs: Home → Shop by Crop → Paddy  
- Internal links from advisory blog to related collections

### Product SEO structure

- Title pattern: `{Product Name} — {Pack Size} | Morbeez` via SEO title field or Liquid fallback  
- Structured data: `Product` + `Offer` + `aggregateRating` when reviews app added  
- Image `alt`: product title + pack size  
- FAQ schema from `morbeez.faq` JSON when present

### Blog SEO

- URL handles: `/blogs/advisory/{handle}` — short, English handles  
- Article schema in `article.liquid`  
- Related products section (optional M1) linking to tagged products

---

## Structured data snippets

| Snippet | Schema type |
|---------|-------------|
| `schema-product.liquid` | Product |
| `schema-organization.liquid` | Organization (sitewide in theme.liquid) |
| `schema-breadcrumb.liquid` | BreadcrumbList |
| `schema-faq.liquid` | FAQPage (from metafield) |

Validate with Google Rich Results Test before launch.

---

## Technical SEO checklist

- [ ] `sitemap.xml` accessible (Shopify auto)  
- [ ] `robots.txt` not blocking `/collections/`  
- [ ] No duplicate H1 on homepage  
- [ ] Pagination: `rel="next/prev"` on collection paginate (Liquid paginate tags)  
- [ ] hreflang via Markets (automatic when configured)  
- [ ] 404 page with search + crop category links

---

## Performance targets

| Metric | Target (mobile) | M1 realistic |
|--------|-----------------|--------------|
| Lighthouse Performance | 90+ | 85+ |
| LCP | < 2.5s | < 3.0s staging |
| INP | < 200ms | < 250ms |
| CLS | < 0.1 | < 0.1 |
| TTFB | Shopify CDN | Monitor |

---

## Image optimization

```liquid
{% render 'morbeez-lazy-image',
  image: product.featured_image,
  widths: '360,540,720,1080',
  sizes: '(max-width: 640px) 100vw, 33vw',
  alt: product.title,
  loading: 'lazy',
  class: 'w-full h-auto'
%}
```

- Use Shopify CDN width parameter — never serve 4000px to mobile  
- Hero: single optimized image; avoid carousel if possible (LCP)  
- SVG for icons (sprite snippet)

---

## Lazy loading strategy

| Asset | Strategy |
|-------|----------|
| Hero image | `loading="eager"` + `fetchpriority="high"` |
| Below fold | `loading="lazy"` |
| Iframes (video) | Facade click-to-load M2 |
| Section backgrounds | CSS `content-visibility: auto` on long homepage |

---

## CSS / JS budget

| Asset | Budget |
|-------|--------|
| theme.css (gzip) | < 50 KB |
| theme.js (gzip) | < 30 KB |
| Alpine (if global) | < 15 KB gzip |

**Critical path:** No render-blocking JS; CSS single file with preconnect to CDN.

---

## Third-party discipline (M1)

- Defer analytics (GA4) until `window.load` or use Shopify Customer Events  
- No Facebook pixel until required (impacts CWV)  
- WhatsApp link is native `<a>` — zero JS cost

---

## Caching & CDN

Shopify handles CDN. Theme assets use `asset_url` with fingerprint.

**Do not** cache-bust manually except on deploy.

---

## Monitoring (post-M1)

- Shopify Web Performance dashboard  
- Weekly Lighthouse CI on staging theme (GitHub Action)  
- Real User Monitoring optional (Shopify Plus / third-party M2)

---

## Pre-launch audit script

1. Run Theme Check  
2. Run Lighthouse mobile on Home, Collection, PDP  
3. Validate schema  
4. Screaming Frog sample (≤ 500 URLs) on staging password store  
5. Fix broken links in mega menu
