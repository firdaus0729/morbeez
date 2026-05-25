import { env } from '../../config/env.js';
import { AppError } from '../../lib/errors.js';
const baseUrl = `https://${env.SHOPIFY_STORE_DOMAIN}/admin/api/${env.SHOPIFY_API_VERSION}`;
function parseLinkHeader(header) {
    const out = { nextPageInfo: null, previousPageInfo: null };
    if (!header)
        return out;
    for (const part of header.split(',')) {
        const pageMatch = part.match(/page_info=([^&>]+)/);
        if (!pageMatch)
            continue;
        const pageInfo = decodeURIComponent(pageMatch[1]);
        if (part.includes('rel="next"'))
            out.nextPageInfo = pageInfo;
        if (part.includes('rel="previous"'))
            out.previousPageInfo = pageInfo;
    }
    return out;
}
export async function shopifyAdminRaw(path, options = {}) {
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
export async function shopifyAdmin(path, options = {}) {
    const { data } = await shopifyAdminRaw(path, options);
    return data;
}
export async function getOrder(orderId) {
    return shopifyAdmin(`/orders/${orderId}.json`);
}
//# sourceMappingURL=shopify.client.js.map