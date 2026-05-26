#!/usr/bin/env node
/** Seed varieties linked to crops. Run after migration 20260531000000 */
import { readFileSync, existsSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = join(__dirname, '..');

function loadEnv() {
  const path = join(root, 'backend', '.env');
  const env = {};
  for (const line of readFileSync(path, 'utf8').split(/\r?\n/)) {
    const t = line.trim();
    if (!t || t.startsWith('#')) continue;
    const eq = t.indexOf('=');
    if (eq < 1) continue;
    env[t.slice(0, eq).trim()] = t.slice(eq + 1).trim().replace(/^["']|["']$/g, '');
  }
  return env;
}

async function main() {
  const env = loadEnv();
  const h = {
    apikey: env.SUPABASE_SERVICE_ROLE_KEY,
    Authorization: `Bearer ${env.SUPABASE_SERVICE_ROLE_KEY}`,
    'Content-Type': 'application/json',
  };
  const base = `${env.SUPABASE_URL}/rest/v1`;

  const cropsRes = await fetch(`${base}/crm_masters?master_type=eq.crop&select=id,name`, { headers: h });
  const crops = await cropsRes.json();
  const pairs = [
    ['Banana', 'Nendran'],
    ['Banana', 'Robusta'],
    ['Pepper', 'Panniyur-1'],
    ['Paddy', 'Jyothi'],
  ];
  for (const [cropName, variety] of pairs) {
    const crop = crops.find((c) => c.name === cropName);
    if (!crop) continue;
    await fetch(`${base}/crm_masters`, {
      method: 'POST',
      headers: { ...h, Prefer: 'return=minimal' },
      body: JSON.stringify({ master_type: 'variety', name: variety, parent_id: crop.id }),
    });
  }
  console.log('Seeded varieties');
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
