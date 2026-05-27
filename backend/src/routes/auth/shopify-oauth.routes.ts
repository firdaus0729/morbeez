import { createHmac, timingSafeEqual } from 'crypto';
import type { FastifyInstance } from 'fastify';
import { env } from '../../config/env.js';
import { logger } from '../../lib/logger.js';

/** Verify Shopify OAuth / App URL query HMAC (hex). */
function verifyShopifyOAuthQuery(query: Record<string, string | undefined>, secret: string): boolean {
  const { hmac, signature, ...rest } = query;
  const sig = hmac ?? signature;
  if (!sig) return false;

  const message = Object.keys(rest)
    .filter((k) => rest[k] !== undefined && rest[k] !== '')
    .sort()
    .map((k) => `${k}=${rest[k]}`)
    .join('&');

  const digest = createHmac('sha256', secret).update(message).digest('hex');
  const a = Buffer.from(digest, 'utf8');
  const b = Buffer.from(String(sig), 'utf8');
  return a.length === b.length && timingSafeEqual(a, b);
}

function shopHandle(shop: string): string {
  return shop.replace(/\.myshopify\.com$/i, '');
}

function installSuccessHtml(shop: string, note?: string): string {
  const handle = shopHandle(shop);
  const adminApps = `https://admin.shopify.com/store/${handle}/settings/apps`;
  const proxyHealth = `https://${shop}/apps/morbeez/health`;
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>Morbeez — App connected</title>
  <style>
    body { font-family: system-ui, sans-serif; max-width: 32rem; margin: 3rem auto; padding: 0 1rem; color: #111; }
    h1 { color: #34B35E; font-size: 1.5rem; }
    a { color: #34B35E; }
    code { background: #f4f4f5; padding: 0.15rem 0.35rem; border-radius: 4px; font-size: 0.9em; }
  </style>
</head>
<body>
  <h1>Morbeez app connected</h1>
  <p>Store: <strong>${shop}</strong></p>
  ${note ? `<p>${note}</p>` : ''}
  <p>Test app proxy: <a href="${proxyHealth}" target="_blank" rel="noopener">${proxyHealth}</a></p>
  <p><a href="${adminApps}">Open Shopify Admin → Apps</a></p>
  <p><small>Redirecting to admin in 3 seconds…</small></p>
  <script>setTimeout(function(){ location.href = ${JSON.stringify(adminApps)}; }, 3000);</script>
</body>
</html>`;
}

/**
 * Shopify Partner app install / OAuth callbacks.
 * Configure in Partner Dashboard (app version):
 *   App URL: https://YOUR_API/auth/shopify/installed
 *   Allowed redirection URL: https://YOUR_API/auth/shopify/callback
 */
export async function shopifyOAuthRoutes(app: FastifyInstance): Promise<void> {
  const secret = env.SHOPIFY_APP_CLIENT_SECRET ?? env.SHOPIFY_WEBHOOK_SECRET;
  const clientId = env.SHOPIFY_APP_CLIENT_ID;
  const apiBase = (env.API_BASE_URL ?? `http://localhost:${env.PORT}`).replace(/\/$/, '');

  /** Loaded after install when App URL is set correctly (not the storefront). */
  app.get('/auth/shopify/installed', async (request, reply) => {
    const q = request.query as Record<string, string | undefined>;
    const shop = q.shop ?? env.SHOPIFY_STORE_DOMAIN;

    if (q.hmac && !verifyShopifyOAuthQuery(q, secret)) {
      return reply.code(401).type('text/html').send('<h1>Invalid request signature</h1>');
    }

    return reply.type('text/html').send(
      installSuccessHtml(
        shop,
        'Installation complete. App proxy paths like <code>/apps/morbeez/health</code> should now work on your store.'
      )
    );
  });

  /** OAuth redirect_uri — exchanges authorization code for access token. */
  app.get('/auth/shopify/callback', async (request, reply) => {
    const q = request.query as Record<string, string | undefined>;

    if (!verifyShopifyOAuthQuery(q, secret)) {
      return reply.code(401).type('text/html').send('<h1>Invalid OAuth signature</h1>');
    }

    const { code, shop } = q;
    if (!shop || !code) {
      return reply.code(400).type('text/html').send('<h1>Missing shop or authorization code</h1>');
    }

    if (!clientId) {
      return reply
        .code(500)
        .type('text/html')
        .send(
          '<h1>Server misconfigured</h1><p>Set SHOPIFY_APP_CLIENT_ID on Render (Partner app Client ID).</p>'
        );
    }

    try {
      const tokenRes = await fetch(`https://${shop}/admin/oauth/access_token`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
        body: JSON.stringify({
          client_id: clientId,
          client_secret: secret,
          code,
        }),
      });

      const tokenBody = (await tokenRes.json()) as { access_token?: string; scope?: string; error?: string };
      if (!tokenRes.ok || !tokenBody.access_token) {
        logger.error({ shop, status: tokenRes.status, body: tokenBody }, 'Shopify OAuth token exchange failed');
        return reply
          .code(502)
          .type('text/html')
          .send(
            `<h1>Could not complete install</h1><p>${tokenBody.error ?? 'Token exchange failed'}. Check redirect URL and app credentials on Render.</p>`
          );
      }

      logger.info({ shop, scope: tokenBody.scope }, 'Shopify app installed (OAuth token received)');
      /* Store token in SHOPIFY_ADMIN_API_ACCESS_TOKEN env for this shop, or extend DB later. */

      return reply.type('text/html').send(installSuccessHtml(shop));
    } catch (err) {
      logger.error({ err, shop }, 'Shopify OAuth callback error');
      return reply.code(500).type('text/html').send('<h1>Install failed</h1><p>API could not reach Shopify. Try again.</p>');
    }
  });

  /** Optional: start OAuth from browser (custom distribution install link helper). */
  app.get('/auth/shopify/install', async (request, reply) => {
    const shop = (request.query as { shop?: string }).shop ?? env.SHOPIFY_STORE_DOMAIN;
    if (!clientId) {
      return reply.code(500).send({ error: 'SHOPIFY_APP_CLIENT_ID not configured' });
    }
    const scopes = env.SHOPIFY_APP_SCOPES;
    const redirectUri = `${apiBase}/auth/shopify/callback`;
    const url = new URL(`https://${shop}/admin/oauth/authorize`);
    url.searchParams.set('client_id', clientId);
    url.searchParams.set('scope', scopes);
    url.searchParams.set('redirect_uri', redirectUri);
    return reply.redirect(url.toString());
  });
}
