#!/usr/bin/env node
/**
 * Verify Meta WhatsApp Cloud API credentials and optional test send.
 * Usage:
 *   node scripts/verify-whatsapp-meta.mjs
 *   node scripts/verify-whatsapp-meta.mjs --send=919876543210
 */
import { readFileSync, existsSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = join(__dirname, '..');

function loadEnv() {
  const path = join(root, 'backend', '.env');
  if (!existsSync(path)) {
    console.error('Missing backend/.env');
    process.exit(1);
  }
  const env = {};
  for (const line of readFileSync(path, 'utf8').replace(/^\uFEFF/, '').split(/\r?\n/)) {
    const t = line.trim();
    if (!t || t.startsWith('#')) continue;
    const eq = t.indexOf('=');
    if (eq < 1) continue;
    let val = t.slice(eq + 1).trim();
    if ((val.startsWith('"') && val.endsWith('"')) || (val.startsWith("'") && val.endsWith("'"))) {
      val = val.slice(1, -1);
    }
    env[t.slice(0, eq).trim()] = val;
  }
  return env;
}

async function main() {
  const env = loadEnv();
  const api = process.env.API_BASE_URL || 'https://morbeez-api.onrender.com';
  const id = env.WHATSAPP_PHONE_NUMBER_ID;
  const token = env.WHATSAPP_ACCESS_TOKEN;

  console.log('API health:', api);
  const health = await fetch(`${api}/health/whatsapp-meta`).then((r) => r.json());
  console.log('Render whatsapp-meta:', health);

  if (!id || !token) {
    console.error('\nMissing WHATSAPP_PHONE_NUMBER_ID or WHATSAPP_ACCESS_TOKEN in backend/.env');
    process.exit(1);
  }

  const phoneRes = await fetch(`https://graph.facebook.com/v21.0/${id}?fields=display_phone_number,verified_name,quality_rating`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  const phoneData = await phoneRes.json();
  if (phoneData.error) {
    console.error('\n❌ Meta token / phone ID invalid:', phoneData.error.message);
    console.error('   Code:', phoneData.error.code, '| Regenerate access token in Meta → WhatsApp → API setup');
    process.exit(1);
  }
  console.log('\n✓ WhatsApp number:', phoneData.display_phone_number, '|', phoneData.verified_name);

  const sendTo = process.argv.find((a) => a.startsWith('--send='))?.split('=')[1];
  if (sendTo) {
    const to = sendTo.replace(/\D/g, '');
    const res = await fetch(`https://graph.facebook.com/v21.0/${id}/messages`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        messaging_product: 'whatsapp',
        to,
        type: 'text',
        text: { body: 'Morbeez test — if you see this, outbound WhatsApp works.' },
      }),
    });
    const body = await res.json();
    if (!res.ok) {
      console.error('\n❌ Send failed:', JSON.stringify(body, null, 2));
      process.exit(1);
    }
    console.log('\n✓ Test message sent to', to, '| message id:', body.messages?.[0]?.id);
  }

  console.log(`
Next checks if farmers get no reply:
1. Meta → WhatsApp → Configuration → Webhook
   Callback: ${api}/webhooks/whatsapp
   Verify token must match WHATSAPP_VERIFY_TOKEN in Render
   Subscribe to: messages
2. Redeploy Render after code/env changes
3. Render logs: search "WhatsApp Cloud inbound"
4. Set ENABLE_WHATSAPP_AUTO_REPLY=false (broken welcome_farmer template in event handler)
`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
