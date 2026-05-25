#!/usr/bin/env node
/** Quick check: Render API health + database + auth signup path */
const API = process.env.API_BASE_URL || 'https://morbeez-api.onrender.com';

async function get(path) {
  const res = await fetch(API + path);
  const text = await res.text();
  let data;
  try {
    data = JSON.parse(text);
  } catch {
    data = { raw: text.slice(0, 200) };
  }
  return { status: res.status, data };
}

async function main() {
  console.log('Checking', API, '\n');

  const health = await get('/health');
  console.log('/health', health.status, health.data.status || health.data);

  const db = await get('/health/db');
  console.log('/health/db', db.status, db.data);

  if (db.status !== 200) {
    console.log('\n⚠️  Fix Render env: swap SUPABASE_SERVICE_ROLE_KEY with SUPABASE_ANON_KEY if reversed.');
    console.log('   Run locally: node scripts/check-supabase-env.mjs');
    process.exit(1);
  }

  const email = `verify-${Date.now()}@example.com`;
  const res = await fetch(API + '/api/v1/auth/signup', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      email,
      firstName: 'Verify',
      lastName: 'Test',
      password: 'testpass123',
      acceptTerms: true,
      newsletter: false,
    }),
  });
  const body = await res.json();
  console.log('/api/v1/auth/signup', res.status, body.message || body.error || 'ok');

  if (!res.ok) {
    console.log('\nFull response:', JSON.stringify(body, null, 2));
    process.exit(1);
  }
  console.log('\n✓ Signup works on Render.');
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
