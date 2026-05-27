# Install Morbeez Partner app on your store

## Why you land on the storefront homepage

After clicking **Morbeez** during install, if the URL looks like:

`morbeez.myshopify.com/?hmac=...&host=...&shop=morbeez.myshopify.com`

the **App URL** in Partner Dashboard is set to the **storefront** (or left blank → defaults to shop). Shopify loads that URL after install — not an error with your secret.

## Fix (Partner Dashboard → Versions → morbeez-2 or new version)

| Setting | Value |
|---------|--------|
| **App URL** | `https://morbeez-api.onrender.com/auth/shopify/installed` |
| **Allowed redirection URL(s)** | `https://morbeez-api.onrender.com/auth/shopify/callback` |
| **App proxy** prefix | `apps` |
| **App proxy** subpath | `morbeez` |
| **App proxy** URL | `https://morbeez-api.onrender.com/proxy` |
| **Scopes** | `write_app_proxy` (minimum) |

Release the version, then reinstall on the store.

**Important:** App URL and Allowed redirection URL must use the **same host** (`morbeez-api.onrender.com`). If App URL is still `morbeez.myshopify.com`, OAuth fails with:

`The redirect_uri and application url must have matching hosts`

## Render env

```env
SHOPIFY_APP_CLIENT_ID=87add483c25cbce127ee00731fb8e5a7
SHOPIFY_APP_CLIENT_SECRET=shpss_...
API_BASE_URL=https://morbeez-api.onrender.com
```

Redeploy after changing env or Partner URLs.

## Install steps

1. **Distribution** → Custom distribution → store `morbeez.myshopify.com` → copy install link.
2. Open install link → select **Morbeez** store → **Install / Approve**.
3. You should see **“Morbeez app connected”** on Render (not the shop homepage).
4. Partner **Overview** → Installs = **1**.
5. Test: `https://morbeez.myshopify.com/apps/morbeez/health` → JSON `{ "ok": true, "proxy": "morbeez" }`.

## Manual install URL (if needed)

```
https://morbeez-api.onrender.com/auth/shopify/install?shop=morbeez.myshopify.com
```
