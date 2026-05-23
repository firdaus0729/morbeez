#!/usr/bin/env node
/**
 * Morbeez M1 — Shopify Admin setup (metafield definitions)
 *
 * Requires .env:
 *   SHOPIFY_STORE=morbeez.myshopify.com
 *   SHOPIFY_ADMIN_API_ACCESS_TOKEN=shpat_...
 *
 * Create token: Admin → Settings → Apps → Develop apps → Admin API access
 * Scopes: read/write products, read/write metaobject definitions (if using metaobjects)
 *
 * Usage: node scripts/setup-m1.mjs
 */

import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __dirname = dirname(fileURLToPath(import.meta.url));
const STORE = process.env.SHOPIFY_STORE;
const TOKEN = process.env.SHOPIFY_ADMIN_API_ACCESS_TOKEN;
const API_VERSION = '2024-10';

if (!STORE || !TOKEN) {
  console.error('Missing SHOPIFY_STORE or SHOPIFY_ADMIN_API_ACCESS_TOKEN in environment.');
  console.error('Copy .env.example to .env and fill values.');
  process.exit(1);
}

const endpoint = `https://${STORE}/admin/api/${API_VERSION}/graphql.json`;

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

async function createMetafieldDefinition(ownerType, def) {
  const mutation = `
    mutation metafieldDefinitionCreate($definition: MetafieldDefinitionInput!) {
      metafieldDefinitionCreate(definition: $definition) {
        createdDefinition { id name }
        userErrors { field message }
      }
    }
  `;

  const type = def.type === 'list.single_line_text_field'
    ? 'list.single_line_text_field'
    : def.type;

  const variables = {
    definition: {
      name: def.name,
      namespace: def.namespace,
      key: def.key,
      description: def.description || '',
      type,
      ownerType,
    },
  };

  const data = await gql(mutation, variables);
  const result = data.metafieldDefinitionCreate;
  if (result.userErrors?.length) {
    const msg = result.userErrors.map((e) => e.message).join('; ');
    if (msg.includes('taken') || msg.includes('exists')) {
      console.log(`  ⏭  ${ownerType} ${def.namespace}.${def.key} (exists)`);
      return;
    }
    throw new Error(msg);
  }
  console.log(`  ✓  ${ownerType} ${def.namespace}.${def.key}`);
}

async function main() {
  const configPath = join(__dirname, '../config/metafields.json');
  const config = JSON.parse(readFileSync(configPath, 'utf8'));

  console.log(`\nMorbeez M1 setup → ${STORE}\n`);

  for (const def of config.product || []) {
    await createMetafieldDefinition('PRODUCT', def);
  }
  for (const def of config.collection || []) {
    await createMetafieldDefinition('COLLECTION', def);
  }
  for (const def of config.customer || []) {
    await createMetafieldDefinition('CUSTOMER', def);
  }

  console.log('\nDone. Next: run docs/M1-STORE-SETUP.md for menus, collections, and sample products.\n');
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
