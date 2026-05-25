# Razorpay checkout (full implementation)

Storefront checkout uses **Razorpay only** — not Shopify’s hosted checkout page.

## Flow

1. Customer clicks **Checkout** on cart → `/pages/checkout`
2. Theme loads cart from `/cart.js`
3. Customer enters contact + India shipping address
4. **Pay with Razorpay** → API creates Razorpay Order → Razorpay modal (UPI / cards / etc.)
5. On success → API verifies signature → creates **paid Shopify order** via Admin API
6. Cart cleared → redirect to `/pages/checkout-success`

## Setup

### 1. Razorpay Dashboard

- Create account at [razorpay.com](https://razorpay.com)
- **API Keys** → Key ID + Key Secret (test, then live)
- **Webhooks** (optional backup): `https://morbeez-api.onrender.com/webhooks/razorpay`  
  Events: `payment.captured`, `payment.failed`

### 2. Backend env (Render + `backend/.env`)

```env
RAZORPAY_KEY_ID=rzp_live_...
RAZORPAY_KEY_SECRET=...
RAZORPAY_WEBHOOK_SECRET=...
ENABLE_RAZORPAY_CHECKOUT=true
SHOPIFY_ADMIN_API_ACCESS_TOKEN=shpat_...  # needs write_orders scope
```

### 3. Database

```powershell
supabase db push
```

Creates `checkout_sessions` table.

### 4. Shopify pages

```powershell
npm run setup:pages
```

Creates pages: `checkout`, `checkout-success` with correct templates.

### 5. Shopify Admin

- **Settings → General** → Store currency **INR**
- **Settings → Checkout** → You may disable accelerated checkout links; cart now points to `/pages/checkout`
- **Custom app / Admin API token** must include: `write_orders`, `read_products`

### 6. Theme

```powershell
npm run build:css
npm run theme:push
```

## API endpoints

| Method | Path | Purpose |
|--------|------|---------|
| GET | `/api/v1/checkout/razorpay/config` | Public Razorpay key |
| POST | `/api/v1/checkout/razorpay/create` | Start checkout |
| POST | `/api/v1/checkout/razorpay/verify` | Verify payment + create Shopify order |

## Disable Shopify checkout link

Cart uses `<a href="/pages/checkout">` instead of `name="checkout"`.  
Do not use Shopify’s **Checkout** button for this store.
