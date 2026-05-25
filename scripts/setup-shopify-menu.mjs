#!/usr/bin/env node
/**
 * Populate Shopify main-menu with Morbeez pages & collections.
 * Pages in Admin do NOT auto-appear in the header — menus are separate.
 *
 * Usage: npm run setup:menu
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
const API_VERSION = process.env.SHOPIFY_API_VERSION || '2024-10';

if (!STORE || !TOKEN || TOKEN.length < 20) {
  console.error('Missing SHOPIFY_STORE / SHOPIFY_ADMIN_API_ACCESS_TOKEN');
  process.exit(1);
}

const endpoint = `https://${STORE}/admin/api/${API_VERSION}/graphql.json`;

/** Top-level + nested items for main-menu */
const MENU_ITEMS = [
  { title: 'Home', url: '/' },
  {
    title: 'Products',
    url: '/collections/all',
    items: [
      { title: 'All products', url: '/collections/all' },
      { title: 'Bio Fertilizers', url: '/collections/bio-fertilizers' },
      { title: 'Bio Pesticides', url: '/collections/bio-pesticides' },
      { title: 'Organic Inputs', url: '/collections/organic-inputs' },
      { title: 'Micronutrients', url: '/collections/micronutrients' },
    ],
  },
  { title: 'Crop Doctor', url: '/pages/crop-doctor' },
  { title: 'Dealers', url: '/pages/dealer-enquiry' },
  { title: 'About us', url: '/pages/about-us' },
  { title: 'FAQ', url: '/pages/faq' },
  { title: 'Contact', url: '/pages/contact' },
  { title: 'Login', url: '/pages/login' },
  { title: 'Careers', url: '/pages/careers' },
  { title: 'Initiatives', url: '/pages/initiatives' },
];

function toMenuInput(item) {
  const entry = {
    title: item.title,
    type: 'HTTP',
    url: item.url.startsWith('http') ? item.url : `https://${STORE}${item.url}`,
  };
  if (item.items?.length) {
    entry.items = item.items.map(toMenuInput);
  }
  return entry;
}

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

async function findMenu(handle) {
  const data = await gql(
    `query ($q: String!) {
      menus(first: 5, query: $q) {
        nodes { id handle title }
      }
    }`,
    { q: `handle:${handle}` }
  );
  return data.menus?.nodes?.[0] ?? null;
}

async function main() {
  const handle = 'main-menu';
  console.log(`\nMorbeez menu setup → ${STORE}\n`);

  let menu = await findMenu(handle);

  if (!menu) {
    const created = await gql(
      `mutation ($title: String!, $handle: String!, $items: [MenuItemCreateInput!]!) {
        menuCreate(title: $title, handle: $handle, items: $items) {
          menu { id handle }
          userErrors { field message }
        }
      }`,
      {
        title: 'Main menu',
        handle,
        items: MENU_ITEMS.map(toMenuInput),
      }
    );
    const errs = created.menuCreate?.userErrors;
    if (errs?.length) throw new Error(errs.map((e) => e.message).join('; '));
    menu = created.menuCreate.menu;
    console.log(`  ✓  Created menu "${handle}" with ${MENU_ITEMS.length} top-level links`);
  } else {
    const updated = await gql(
      `mutation ($id: ID!, $title: String!, $items: [MenuItemUpdateInput!]!) {
        menuUpdate(id: $id, title: $title, items: $items) {
          menu { id handle }
          userErrors { field message }
        }
      }`,
      {
        id: menu.id,
        title: menu.title || 'Main menu',
        items: MENU_ITEMS.map(toMenuInput),
      }
    );
    const errs = updated.menuUpdate?.userErrors;
    if (errs?.length) throw new Error(errs.map((e) => e.message).join('; '));
    console.log(`  ✓  Updated "${handle}" with ${MENU_ITEMS.length} top-level links`);
  }

  console.log('\nNext: Theme customize → Header → Main navigation menu → main-menu → Save');
  console.log('Or refresh the storefront — header should show all tabs.\n');
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
