# M3 — Product Recommendation Engine

## MVP approach

Rule-based mapping in `backend/config/recommendations/ginger.json`:

- Match `recommendedProductTags` + `probableIssue` text against rule `matchTags`
- Output up to 5 products with handles, dosage schedules, priority
- Default kit if no rule matches

## Future

- Shopify Admin API product lookup by handle
- Agronomist correction feedback loop
- ML ranking / campaign overlays

## Shopify linkage

Store product handles in rules (e.g. `ginger-disease-shield`) — theme PDPs use same handles.
