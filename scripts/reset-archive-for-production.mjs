#!/usr/bin/env node
/**
 * Remove demo / test data from the Morbeez farmer archive (Supabase).
 *
 * Usage:
 *   npm run archive:reset-demo
 *     → Deletes seed demo farmers (source=seed, phones 9876543210–9876543217) and orphan leads.
 *
 *   npm run archive:reset -- --confirm
 *     → Full transactional reset: all farmers, leads, orders, AI sessions, CRM rows, webhook logs.
 *     → Keeps admin_users, crm_masters, advisory_faq_cache, product_intelligence.
 *
 * Requires backend/.env with SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY.
 */
import { readFileSync, existsSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = join(__dirname, '..');

const DEMO_PHONES_10 = ['9876543210', '9876543211', '9876543212', '9876543213', '9876543214', '9876543215', '9876543216', '9876543217'];
const DEMO_PHONES = [...DEMO_PHONES_10, ...DEMO_PHONES_10.map((p) => `91${p}`)];

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
  if (!env.SUPABASE_URL || !env.SUPABASE_SERVICE_ROLE_KEY) {
    console.error('backend/.env must define SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY');
    process.exit(1);
  }
  return env;
}

function sbHeaders(env, prefer = 'return=representation') {
  return {
    apikey: env.SUPABASE_SERVICE_ROLE_KEY,
    Authorization: `Bearer ${env.SUPABASE_SERVICE_ROLE_KEY}`,
    'Content-Type': 'application/json',
    Prefer: prefer,
  };
}

async function sb(env, table, method, body, query = '', prefer) {
  const res = await fetch(`${env.SUPABASE_URL}/rest/v1/${table}${query}`, {
    method,
    headers: sbHeaders(env, prefer),
    body: body != null ? JSON.stringify(body) : undefined,
  });
  const text = await res.text();
  let data = null;
  if (text) {
    try {
      data = JSON.parse(text);
    } catch {
      data = text;
    }
  }
  if (!res.ok) {
    const msg = data?.message || data?.error || (typeof data === 'string' ? data : JSON.stringify(data));
    throw new Error(`${table}${query}: ${msg || `HTTP ${res.status}`}`);
  }
  return data;
}

async function sbCount(env, table, query = '') {
  const res = await fetch(`${env.SUPABASE_URL}/rest/v1/${table}?${query}&select=id`, {
    method: 'HEAD',
    headers: {
      ...sbHeaders(env, 'count=exact'),
      Prefer: 'count=exact',
    },
  });
  const range = res.headers.get('content-range') || '';
  const m = range.match(/\/(\d+)$/);
  return m ? parseInt(m[1], 10) : 0;
}

async function deleteByFilter(env, table, filter) {
  const before = await sbCount(env, table, filter);
  if (before === 0) return 0;
  await sb(env, table, 'DELETE', null, `?${filter}`);
  return before;
}

async function deleteAllRows(env, table) {
  let total = 0;
  for (;;) {
    const res = await fetch(`${env.SUPABASE_URL}/rest/v1/${table}?select=id&limit=200`, {
      headers: sbHeaders(env, 'return=representation'),
    });
    const rows = await res.json();
    if (!res.ok) throw new Error(rows?.message || JSON.stringify(rows));
    if (!Array.isArray(rows) || rows.length === 0) break;
    const ids = rows.map((r) => r.id).filter(Boolean);
    if (!ids.length) break;
    const inList = ids.join(',');
    await sb(env, table, 'DELETE', null, `?id=in.(${inList})`);
    total += ids.length;
  }
  return total;
}

async function resetDemo(env) {
  console.log('Removing demo seed farmers and related CRM data…\n');

  const seedCount = await deleteByFilter(env, 'farmers', 'source=eq.seed');
  console.log(`  farmers (source=seed): ${seedCount}`);

  const phoneFilter = `phone=in.(${DEMO_PHONES.join(',')})`;
  const phoneCount = await deleteByFilter(env, 'farmers', phoneFilter);
  console.log(`  farmers (demo phones): ${phoneCount}`);

  const orphanLeads = await deleteByFilter(env, 'leads', 'farmer_id=is.null');
  console.log(`  orphan leads: ${orphanLeads}`);

  console.log('\nDemo reset complete. Re-test signup and WhatsApp with real numbers.');
}

async function resetFull(env) {
  console.log('FULL archive reset — deleting all transactional farmer data…\n');

  const tables = [
    'webhook_logs',
    'event_outbox',
    'crm_sync_queue',
    'ai_request_logs',
    'advisory_automation_jobs',
    'telecaller_notes',
    'ai_product_recommendations',
    'ai_advisory_outputs',
    'agronomist_escalations',
    'disease_history',
    'farmer_ai_usage_daily',
    'farmer_image_hashes',
    'ai_advisory_sessions',
    'crm_manual_orders',
    'crm_field_findings',
    'crm_recommendations',
    'crm_soil_reports',
    'farmer_agronomist_assignments',
    'farm_blocks',
    'crm_tasks',
    'crm_call_logs',
    'farmer_crops',
    'interaction_logs',
    'quotation_inquiries',
    'callback_requests',
    'leads',
    'payment_events',
    'shipment_events',
    'commerce_orders',
    'checkout_sessions',
    'farmers',
  ];

  for (const table of tables) {
    try {
      const n = await deleteAllRows(env, table);
      console.log(`  ${table}: ${n}`);
    } catch (e) {
      console.warn(`  ${table}: skipped (${e.message})`);
    }
  }

  console.log('\nFull reset complete.');
  console.log('Preserved: admin_users, crm_masters, advisory_faq_cache, product_intelligence, commerce promos.');
  console.log('Next: redeploy API, push theme, create staff with npm run admin:create-user, test real signup + WhatsApp.');
}

function parseMode() {
  const args = process.argv.slice(2);
  const modeArg = args.find((a) => a.startsWith('--mode='))?.split('=')[1];
  if (args.includes('--confirm') || modeArg === 'full') return 'full';
  return modeArg === 'demo' || !modeArg ? 'demo' : 'demo';
}

async function main() {
  const env = loadEnv();
  const mode = parseMode();

  if (mode === 'full') {
    if (!process.argv.includes('--confirm')) {
      console.error(
        'Full reset deletes ALL farmers, leads, orders, and AI sessions.\n' +
          'Re-run with: npm run archive:reset -- --confirm'
      );
      process.exit(1);
    }
    console.log('⚠️  PRODUCTION FULL RESET\n');
    await resetFull(env);
  } else {
    await resetDemo(env);
  }
}

main().catch((e) => {
  console.error(e.message || e);
  setTimeout(() => process.exit(1), 50);
});
