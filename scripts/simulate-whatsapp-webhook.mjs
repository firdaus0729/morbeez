#!/usr/bin/env node
/**
 * Simulate Meta sending "Hello" to your Render webhook (tests full pipeline).
 * Usage: node scripts/simulate-whatsapp-webhook.mjs
 *        node scripts/simulate-whatsapp-webhook.mjs --from=916282873542
 */
import { createHmac } from 'crypto';
import { readFileSync, existsSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = join(__dirname, '..');

function loadEnv() {
  const path = join(root, 'backend', '.env');
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
  const secret = env.WHATSAPP_APP_SECRET;
  const fromArg = process.argv.find((a) => a.startsWith('--from='))?.split('=')[1];
  const from = (fromArg || '919876543210').replace(/\D/g, '');
  const msgId = `wamid.sim.${Date.now()}`;

  if (!secret) {
    console.error('WHATSAPP_APP_SECRET missing in backend/.env');
    process.exit(1);
  }

  const payload = {
    object: 'whatsapp_business_account',
    entry: [
      {
        id: 'SIMULATED_ENTRY',
        changes: [
          {
            field: 'messages',
            value: {
              messaging_product: 'whatsapp',
              metadata: {
                display_phone_number: '917676026318',
                phone_number_id: env.WHATSAPP_PHONE_NUMBER_ID || '1127102317154194',
              },
              contacts: [{ profile: { name: 'Webhook Test' }, wa_id: from }],
              messages: [
                {
                  from,
                  id: msgId,
                  timestamp: String(Math.floor(Date.now() / 1000)),
                  type: 'text',
                  text: { body: 'Hello' },
                },
              ],
            },
          },
        ],
      },
    ],
  };

  const body = JSON.stringify(payload);
  const sig = 'sha256=' + createHmac('sha256', secret).update(body).digest('hex');
  const url = `${api.replace(/\/$/, '')}/webhooks/whatsapp`;

  console.log('POST', url);
  console.log('Simulated farmer wa_id:', from);

  const res = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-hub-signature-256': sig,
    },
    body,
  });

  const text = await res.text();
  console.log('Status:', res.status, text);

  if (res.status === 200) {
    console.log('\nIf pipeline + token work, WhatsApp should reply to', from, 'within ~10s.');
    console.log('If no WhatsApp reply: check Render logs for "WhatsApp outbound failed".');
  } else if (res.status === 401 || res.status === 403) {
    console.log('\n❌ Signature rejected — WHATSAPP_APP_SECRET on Render must match Meta App secret exactly.');
  } else {
    console.log('\n❌ Webhook error — check Render logs.');
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
