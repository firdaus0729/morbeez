#!/usr/bin/env node
/**
 * Create first Morbeez staff admin user.
 * Usage: npm run admin:create-user -- --email admin@morbeez.in --password "YourSecurePass" --name "Admin User"
 */
import { randomBytes, scryptSync } from 'crypto';
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
  const text = readFileSync(path, 'utf8').replace(/^\uFEFF/, '');
  for (const line of text.split(/\r?\n/)) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) continue;
    const eq = trimmed.indexOf('=');
    if (eq < 1) continue;
    const key = trimmed.slice(0, eq).trim();
    let val = trimmed.slice(eq + 1).trim();
    if ((val.startsWith('"') && val.endsWith('"')) || (val.startsWith("'") && val.endsWith("'"))) {
      val = val.slice(1, -1);
    }
    env[key] = val;
  }
  if (!env.SUPABASE_URL || !env.SUPABASE_SERVICE_ROLE_KEY) {
    console.error('backend/.env must define SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY');
    process.exit(1);
  }
  return env;
}

function hashPassword(password) {
  const salt = randomBytes(16).toString('hex');
  const hash = scryptSync(password, salt, 64).toString('hex');
  return `${salt}:${hash}`;
}

function parseArgs() {
  const args = process.argv.slice(2);
  const out = { email: '', password: '', name: 'Morbeez Admin', role: 'admin' };
  for (let i = 0; i < args.length; i++) {
    if (args[i] === '--email') out.email = args[++i];
    else if (args[i] === '--password') out.password = args[++i];
    else if (args[i] === '--name') out.name = args[++i];
    else if (args[i] === '--role') out.role = args[++i];
  }
  return out;
}

async function main() {
  const { email, password, name, role } = parseArgs();
  if (!email || !password) {
    console.error(
      'Usage: npm run admin:create-user -- --email you@company.com --password "secret" [--name "Full Name"]'
    );
    process.exit(1);
  }
  if (password.length < 8) {
    console.error('Password must be at least 8 characters');
    process.exit(1);
  }

  const env = loadEnv();
  const row = {
    email: email.trim().toLowerCase(),
    password_hash: hashPassword(password),
    full_name: name,
    role: ['admin', 'manager', 'viewer'].includes(role) ? role : 'admin',
    active: true,
  };

  const res = await fetch(`${env.SUPABASE_URL}/rest/v1/admin_users`, {
    method: 'POST',
    headers: {
      apikey: env.SUPABASE_SERVICE_ROLE_KEY,
      Authorization: `Bearer ${env.SUPABASE_SERVICE_ROLE_KEY}`,
      'Content-Type': 'application/json',
      Prefer: 'return=representation',
    },
    body: JSON.stringify(row),
  });

  const body = await res.json().catch(() => ({}));
  if (!res.ok) {
    if (body?.code === '23505') console.error('Admin with this email already exists.');
    else console.error(body?.message || JSON.stringify(body));
    process.exit(1);
  }

  const user = Array.isArray(body) ? body[0] : body;
  console.log('Admin user created:', { id: user.id, email: user.email, role: user.role });
  console.log('Sign in at: http://localhost:' + (env.PORT || 3000) + '/admin/');
}

main();
