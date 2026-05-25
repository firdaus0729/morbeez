import { env } from '../../config/env.js';
import { AppError } from '../../lib/errors.js';

const baseUrl = `https://${env.SHOPIFY_STORE_DOMAIN}/admin/api/${env.SHOPIFY_API_VERSION}`;

export interface ShopifyLinkInfo {
  nextPageInfo: string | null;
  previousPageInfo: string | null;
}

function parseLinkHeader(header: string | null): ShopifyLinkInfo {
  const out: ShopifyLinkInfo = { nextPageInfo: null, previousPageInfo: null };
  if (!header) return out;

  for (const part of header.split(',')) {
    const pageMatch = part.match(/page_info=([^&>]+)/);
    if (!pageMatch) continue;
    const pageInfo = decodeURIComponent(pageMatch[1]);
    if (part.includes('rel="next"')) out.nextPageInfo = pageInfo;
    if (part.includes('rel="previous"')) out.previousPageInfo = pageInfo;
  }
  return out;
}

export async function shopifyAdminRaw(
  path: string,
  options: RequestInit = {}
): Promise<{ data: unknown; links: ShopifyLinkInfo }> {
  const res = await fetch(`${baseUrl}${path}`, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      'X-Shopify-Access-Token': env.SHOPIFY_ADMIN_API_ACCESS_TOKEN,
      ...options.headers,
    },
  });

  if (!res.ok) {
    const text = await res.text();
    throw new AppError(`Shopify API error: ${res.status}`, res.status, 'SHOPIFY_API_ERROR', text);
  }

  const data = await res.json();
  return { data, links: parseLinkHeader(res.headers.get('link')) };
}

export async function shopifyAdmin<T>(
  path: string,
  options: RequestInit = {}
): Promise<T> {
  const { data } = await shopifyAdminRaw(path, options);
  return data as T;
}

export interface ShopifyOrder {
  id: number;
  name: string;
  email: string | null;
  phone: string | null;
  financial_status: string;
  fulfillment_status: string | null;
  total_price: string;
  currency: string;
  tags: string;
  customer?: { id: number; phone: string | null; first_name: string | null };
  shipping_address?: Record<string, string>;
  line_items: Array<{ title: string; quantity: number; sku: string | null }>;
}

export async function getOrder(orderId: string): Promise<{ order: ShopifyOrder }> {
  return shopifyAdmin(`/orders/${orderId}.json`);
}
