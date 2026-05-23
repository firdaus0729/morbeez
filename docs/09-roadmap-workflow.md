# 09 — Roadmap, Tasks, Git Workflow & Priorities

## Milestone map (high level)

| Milestone | Focus | Duration |
|-----------|-------|----------|
| **M1** (current) | Shopify foundation, homepage, taxonomy, metafields | 1–2 weeks |
| M2 | WhatsApp backend, enquiry flows, notifications | 2–3 weeks |
| M3 | AI Crop Doctor, OpenAI, recommendations | 3–4 weeks |
| M4 | CRM, dealer B2B, payments/shipping depth | 3–4 weeks |
| M5 | Mobile app API hardening, affiliate, campaigns automation | TBD |

---

## M1 task breakdown (granular)

### Epic A — Store & project setup (8h)

- [ ] A1 Create Shopify Partner dev store  
- [ ] A2 Configure `.shopify/project.toml` + CLI auth  
- [ ] A3 Create GitHub repo + branch protection  
- [ ] A4 Install Translate & Adapt, Search & Discovery, Forms  
- [ ] A5 Configure Markets (EN + ML scaffold)

### Epic B — Taxonomy & catalog (12h)

- [ ] B1 Create collection handles per taxonomy doc  
- [ ] B2 Define automated tag rules  
- [ ] B3 Build main-menu + footer + mega menu link lists  
- [ ] B4 Import 10–20 sample products with metafields (Matrixify)  
- [ ] B5 Create blog `advisory` with 2–3 sample posts

### Epic C — Theme core (16h)

- [ ] C1 Scaffold theme folders + `theme.liquid`  
- [ ] C2 `settings_schema.json` brand + feature flags  
- [ ] C3 Header, announcement bar, mega menu, mobile drawer  
- [ ] C4 Footer + language switcher  
- [ ] C5 Tailwind build pipeline + design tokens  
- [ ] C6 Core snippets (card, tile, button, image, schema)

### Epic D — Homepage (20h)

- [ ] D1–D12 Implement 12 sections per spec  
- [ ] D13 `index.json` ordering + presets  
- [ ] D14 Sticky WhatsApp global section  
- [ ] D15 Mobile QA pass all breakpoints

### Epic E — PDP & PLP (12h)

- [ ] E1 `product.json` + `main-product`  
- [ ] E2 Metafield tabs snippet  
- [ ] E3 `collection.json` + banner + filters integration  
- [ ] E4 List-collections page (optional)

### Epic F — Metafields & SEO (8h)

- [ ] F1 Install definitions from `config/metafields.json`  
- [ ] F2 Meta tags + product/collection schema  
- [ ] F3 Lighthouse fixes iteration  
- [ ] F4 Theme Check CI green

### Epic G — Handoff (4h)

- [ ] G1 Client customization guide (1-pager)  
- [ ] G2 Staging theme publish + walkthrough  
- [ ] G3 M2 backlog grooming

**Total estimate:** ~80 hours (fits 1–2 weeks with 1 senior + 1 theme dev)

---

## Development priorities (ordered)

1. Navigation shell (buyers must browse)  
2. Collection taxonomy + sample products  
3. PDP metafield display (trust for ag buyers)  
4. Homepage hero + crop/problem (conversion paths)  
5. Remaining homepage sections  
6. SEO/schema  
7. i18n switcher + ml.json scaffold  
8. Performance polish  
9. Metaobjects (if time)

---

## Git workflow

### Branches

- `main` — production-ready theme releases  
- `develop` — integration branch (optional)  
- `feature/*` — section or epic work  
- `release/m1-*` — milestone tags

### Commit convention

```
feat(sections): add hero-premium with trust badges
fix(css): reduce mobile hero LCP
docs(metafields): add compatibility field
chore(ci): theme-check workflow
```

### PR checklist

- [ ] Theme Check passes  
- [ ] Screenshot mobile + desktop for UI PRs  
- [ ] No hardcoded user-facing strings (locale keys)  
- [ ] Section schema has presets  
- [ ] Reviewed in Theme Editor on staging

### Release tagging

```bash
git tag -a v1.0.0-m1 -m "Milestone 1: Shopify foundation"
git push origin v1.0.0-m1
```

---

## GitHub Actions (Theme Check)

See [`.github/workflows/theme-check.yml`](../.github/workflows/theme-check.yml).

Runs on PR to `main`: `shopify theme check` + optional Lighthouse (manual dispatch).

---

## Team roles (₹1L milestone typical)

| Role | Responsibility |
|------|----------------|
| Solution architect | Taxonomy, metafields, scalability docs |
| Shopify theme dev | Liquid, CSS, sections |
| UI designer | Figma tokens, hero, mobile (parallel week 1) |
| Ag domain reviewer | Copy, crop/problem accuracy |
| PM | UAT, client sign-off |

---

## Risk register (M1)

| Risk | Mitigation |
|------|------------|
| Scope creep into AI/WhatsApp | Strict out-of-scope list in SOW |
| Malayalam quality | Professional translator; don't machine-translate dosage alone |
| Performance with many sections | `content-visibility`, limit carousels |
| Metafield admin complexity | Use metaobject templates + Matrixify import |
| Client edits break layout | Presets + section limits + training |

---

## Sign-off criteria

Client signs M1 when:

1. Staging theme matches approved Figma (key pages)  
2. Taxonomy navigable on mobile  
3. Sample PDP shows all metafield tabs  
4. Admin can edit hero and featured collection without developer  
5. Documentation package delivered (this repo `docs/`)
