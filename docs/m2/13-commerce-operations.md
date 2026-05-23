# M2 — Commerce Operations (Shopify)

## Product configuration

| Requirement | Shopify implementation |
|-------------|------------------------|
| Multiple variants | Variant option: Pack size |
| Quantity pricing | Quantity breaks (Plus) or apps |
| Combo offers | Bundle products / combo collection |
| Dealer pricing | Customer tags + B2B catalogs (Plus) |
| Subscriptions | Recharge (M3) |
| Crop/problem mapping | Tags + M1 metafields |
| AI tags | `morbeez.ai_recommendation_tags` |
| Multilingual | Markets + Translate & Adapt |

## Collections & filters

- M1 taxonomy (crop/problem/category)
- Search & Discovery filters on tags + metafields
- Theme `collection-filters` section (M1)

## Inventory

- Shopify inventory tracking per location
- Low stock alerts in Admin
- API can read inventory via Admin API (M3)

## Quotation workflow

1. Farmer requests quote (WhatsApp / form)
2. `quotation_inquiries` row created
3. Telecaller builds quote in Admin
4. `POST /api/v1/payments/link` → Razorpay link sent on WhatsApp
5. On payment → link to Shopify order manually or via draft order API (M3)

## COD workflow

1. Shopify checkout COD
2. `commerce_orders.is_cod = true`
3. Shiprocket shipment with `payment_method: COD`
4. Razorpay not involved for collection (SR COD remittance)
