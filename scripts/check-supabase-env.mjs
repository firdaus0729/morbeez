#!/usr/bin/env node
/** Verify Supabase keys in backend/.env have correct JWT roles (no secrets printed). */
import { readFileSync, existsSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const envPath = join(dirname(fileURLToPath(import.meta.url)), '../backend/.env');
if (!existsSync(envPath)) {
  console.error('backend/.env not found');
  process.exit(1);
}

function role(jwt) {
  try {
    return JSON.parse(Buffer.from(jwt.split('.')[1], 'base64url').toString()).role;
  } catch {
    return 'invalid';
  }
}

const text = readFileSync(envPath, 'utf8');
const get = (k) => {
  const m = text.match(new RegExp(`^${k}=(.+)$`, 'm'));
  return m ? m[1].replace(/^["']|["']$/g, '').trim() : '';
};

const service = role(get('SUPABASE_SERVICE_ROLE_KEY'));
const anon = role(get('SUPABASE_ANON_KEY'));

console.log('SUPABASE_SERVICE_ROLE_KEY role:', service);
console.log('SUPABASE_ANON_KEY role:', anon);

if (service !== 'service_role') {
  console.error('\n⚠️  SERVICE_ROLE_KEY must be service_role (Settings → API → service_role secret).');
  if (service === 'anon' && anon === 'service_role') {
    console.error('   Keys look SWAPPED — swap them in backend/.env and on Render.');
  }
  process.exit(1);
}
console.log('\n✓ Supabase keys look correct.');
