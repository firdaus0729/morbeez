/**
 * Converts morbeez-product-master-catalog.csv → Shopify Products import CSV
 * Run: node scripts/export-shopify-product-import.mjs
 * Then: Shopify Admin → Products → Import → upload config/shopify-products-import.csv
 */
import { readFileSync, writeFileSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const IN = join(__dirname, '../config/morbeez-product-master-catalog.csv');
const OUT = join(__dirname, '../config/shopify-products-import.csv');

function parseCsv(text) {
  const rows = [];
  let row = [];
  let cell = '';
  let inQuotes = false;
  for (let i = 0; i < text.length; i++) {
    const c = text[i];
    if (inQuotes) {
      if (c === '"' && text[i + 1] === '"') {
        cell += '"';
        i++;
      } else if (c === '"') inQuotes = false;
      else cell += c;
    } else if (c === '"') inQuotes = true;
    else if (c === ',') {
      row.push(cell);
      cell = '';
    } else if (c === '\n' || c === '\r') {
      if (c === '\r' && text[i + 1] === '\n') i++;
      if (row.length || cell) {
        row.push(cell);
        rows.push(row);
        row = [];
        cell = '';
      }
    } else cell += c;
  }
  if (row.length || cell) {
    row.push(cell);
    rows.push(row);
  }
  return rows;
}

function esc(val) {
  const s = String(val ?? '');
  return /[",\n\r]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
}

function htmlBody(desc, benefits, crops, method, dosage) {
  const b = benefits ? `<ul>${benefits.split(',').map((x) => `<li>${x.trim()}</li>`).join('')}</ul>` : '';
  return `<p>${desc}</p>${b}<p><strong>Suitable crops:</strong> ${crops}</p><p><strong>Application:</strong> ${method}</p><p><strong>Dosage (200 L):</strong> ${dosage}</p>`;
}

const raw = readFileSync(IN, 'utf8');
const table = parseCsv(raw);
const headers = table[0];
const idx = Object.fromEntries(headers.map((h, i) => [h, i]));

const SHOPIFY_HEADERS = [
  'Handle',
  'Title',
  'Body (HTML)',
  'Vendor',
  'Type',
  'Tags',
  'Published',
  'Option1 Name',
  'Option1 Value',
  'Variant SKU',
  'Variant Price',
  'Variant Inventory Qty',
  'SEO Title',
  'SEO Description',
];

const lines = [SHOPIFY_HEADERS.join(',')];
let variantRows = 0;

for (let r = 1; r < table.length; r++) {
  const row = table[r];
  if (!row.length || row.length < 5) continue;

  const handle = row[idx['Shopify Handle']] || row[idx['Product Trade Name']]?.toLowerCase().replace(/\s+/g, '-');
  const title = row[idx['Product Trade Name']];
  const type = row[idx['Main Category']];
  const tags = row[idx['Keywords/Tags']];
  const desc = row[idx['SEO Optimized Detailed Description']];
  const benefits = row[idx['Benefits']];
  const crops = row[idx['Suitable Crops']];
  const method = row[idx['Application Method']];
  const dosage = row[idx['Dosage Per 200L Water']];
  const body = htmlBody(desc, benefits, crops, method, dosage);
  const productType = row[idx['Product Type']] || 'liquid';

  const packs = [
    ['500g/ml', row[idx['500g/ml Rate (INR)']], productType === 'liquid' ? '500 ml' : '500 g'],
    ['1kg/L', row[idx['1kg/L Rate (INR)']], productType === 'liquid' ? '1 L' : '1 kg'],
    ['5kg/L', row[idx['5kg/L Rate (INR)']], productType === 'liquid' ? '5 L' : '5 kg'],
    ['10kg/L', row[idx['10kg/L Rate (INR)']], productType === 'liquid' ? '10 L' : '10 kg'],
    ['25kg/L', row[idx['25kg/L Rate (INR)']], productType === 'liquid' ? '25 L' : '25 kg'],
  ].filter(([, price]) => price && Number(price) > 0);

  const isFirst = { v: true };
  for (const [, price, size] of packs) {
    const sku = `${handle}-${size.replace(/\s/g, '').toLowerCase()}`;
    lines.push(
      [
        handle,
        isFirst.v ? title : '',
        isFirst.v ? body : '',
        isFirst.v ? 'Morbeez' : '',
        isFirst.v ? type : '',
        isFirst.v ? tags : '',
        isFirst.v ? 'TRUE' : '',
        'Size',
        size,
        sku,
        price,
        '100',
        isFirst.v ? title : '',
        isFirst.v ? desc?.slice(0, 320) : '',
      ]
        .map(esc)
        .join(',')
    );
    isFirst.v = false;
    variantRows++;
  }
}

writeFileSync(OUT, lines.join('\n'), 'utf8');
console.log(`Shopify import CSV: ${lines.length - 1} variant rows → ${OUT}`);
console.log('Import: Shopify Admin → Products → Import → upload this file');
