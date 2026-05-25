#!/usr/bin/env node
/**
 * Create Morbeez Online Store pages (fixes /pages/login 404, etc.)
 *
 * Requires .env at repo root:
 *   SHOPIFY_STORE=morbeez.myshopify.com
 *   SHOPIFY_ADMIN_API_ACCESS_TOKEN=shpat_...
 *
 * Scopes: write_content (or write_online_store_pages)
 *
 * Usage: node scripts/setup-shopify-pages.mjs
 */

import { readFileSync, existsSync } from 'fs';
import { dirname, join } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));

function loadEnvFile(path) {
  if (!existsSync(path)) return;
  const text = readFileSync(path, 'utf8').replace(/^\uFEFF/, '');
  for (const line of text.split(/\r?\n/)) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) continue;
    const m = trimmed.match(/^([A-Za-z_][A-Za-z0-9_]*)\s*=\s*(.*)$/);
    if (!m || process.env[m[1]]) continue;
    let val = m[2].trim();
    if ((val.startsWith('"') && val.endsWith('"')) || (val.startsWith("'") && val.endsWith("'"))) {
      val = val.slice(1, -1);
    }
    const hash = val.indexOf(' #');
    if (hash > 0) val = val.slice(0, hash).trim();
    process.env[m[1]] = val;
  }
}

loadEnvFile(join(__dirname, '../.env'));
loadEnvFile(join(__dirname, '../backend/.env'));

const STORE = process.env.SHOPIFY_STORE || process.env.SHOPIFY_STORE_DOMAIN;
const TOKEN = process.env.SHOPIFY_ADMIN_API_ACCESS_TOKEN;
const API_VERSION = '2024-10';

if (!STORE || !TOKEN || TOKEN.includes('your_') || TOKEN.length < 20) {
  console.error('Missing valid Shopify Admin credentials.');
  console.error('Add to .env or backend/.env:');
  console.error('  SHOPIFY_STORE=morbeez.myshopify.com  (or SHOPIFY_STORE_DOMAIN)');
  console.error('  SHOPIFY_ADMIN_API_ACCESS_TOKEN=shpat_...');
  process.exit(1);
}

const endpoint = `https://${STORE}/admin/api/${API_VERSION}/graphql.json`;

/** handle → theme template suffix (page.{suffix}.json) */
const PAGES = [
  { title: 'Login', handle: 'login', templateSuffix: 'login', body: '<p>Farmer login and sign up for Morbeez.</p>' },
  { title: 'Contact', handle: 'contact', templateSuffix: 'contact', body: '<p>Contact Morbeez for crop advisory and orders.</p>' },
  { title: 'About us', handle: 'about-us', templateSuffix: 'about', body: '<p>About Morbeez — science-backed agriculture for Indian farmers.</p>' },
  { title: 'FAQ', handle: 'faq', templateSuffix: 'faq', body: '<p>Frequently asked questions.</p>' },
  { title: 'Crop Doctor', handle: 'crop-doctor', templateSuffix: 'crop-doctor', body: '<p>AI-assisted crop diagnosis.</p>' },
  { title: 'Dealer enquiry', handle: 'dealer-enquiry', templateSuffix: 'dealer-enquiry', body: '<p>Become a Morbeez dealer.</p>' },
  { title: 'Careers', handle: 'careers', templateSuffix: null, body: '<p>Careers at Morbeez.</p>' },
  { title: 'Initiatives', handle: 'initiatives', templateSuffix: null, body: '<p>Morbeez farmer initiatives.</p>' },
];

async function gql(query, variables = {}) {
  const res = await fetch(endpoint, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-Shopify-Access-Token': TOKEN,
    },
    body: JSON.stringify({ query, variables }),
  });
  const json = await res.json();
  if (json.errors) throw new Error(JSON.stringify(json.errors, null, 2));
  return json.data;
}

async function findPageByHandle(handle) {
  const data = await gql(
    `query ($q: String!) {
      pages(first: 1, query: $q) {
        nodes { id handle title templateSuffix }
      }
    }`,
    { q: `handle:${handle}` }
  );
  return data.pages?.nodes?.[0] ?? null;
}

async function createPage({ title, handle, templateSuffix, body }) {
  const existing = await findPageByHandle(handle);
  if (existing) {
    console.log(`  ⏭  /pages/${handle} already exists (${existing.title})`);
    if (templateSuffix && existing.templateSuffix !== templateSuffix) {
      await updatePageTemplate(existing.id, templateSuffix);
      console.log(`      → updated template to page.${templateSuffix}`);
    }
    return existing;
  }

  const page = {
    title,
    handle,
    body,
    isPublished: true,
  };
  if (templateSuffix) page.templateSuffix = templateSuffix;

  const data = await gql(
    `mutation ($page: PageCreateInput!) {
      pageCreate(page: $page) {
        page { id handle title templateSuffix }
        userErrors { field message }
      }
    }`,
    { page }
  );

  const result = data.pageCreate;
  if (result.userErrors?.length) {
    throw new Error(result.userErrors.map((e) => e.message).join('; '));
  }
  console.log(`  ✓  /pages/${handle} (template: ${templateSuffix || 'default'})`);
  return result.page;
}

async function updatePageTemplate(pageId, templateSuffix) {
  const data = await gql(
    `mutation ($id: ID!, $page: PageUpdateInput!) {
      pageUpdate(id: $id, page: $page) {
        page { templateSuffix }
        userErrors { field message }
      }
    }`,
    { id: pageId, page: { templateSuffix } }
  );
  const errs = data.pageUpdate?.userErrors;
  if (errs?.length) throw new Error(errs.map((e) => e.message).join('; '));
}

async function main() {
  console.log(`\nMorbeez pages setup → ${STORE}\n`);
  for (const p of PAGES) {
    await createPage(p);
  }
  console.log('\nDone. Open https://' + STORE.replace(/^https?:\/\//, '') + '/pages/login\n');
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
