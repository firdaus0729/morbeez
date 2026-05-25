import { shopifyAdmin, shopifyAdminRaw } from './shopify.client.js';
import { NotFoundError, ValidationError } from '../../lib/errors.js';
const LIST_FIELDS = 'id,title,handle,status,vendor,product_type,tags,created_at,updated_at,variants,image,images';
const CACHE_TTL_MS = 60_000;
let productListCache = null;
function clearProductListCache() {
    productListCache = null;
}
function totalInventory(p) {
    return (p.variants ?? []).reduce((sum, v) => sum + (v.inventory_quantity ?? 0), 0);
}
function mapProduct(p) {
    const v = p.variants?.[0];
    const images = [...(p.images ?? [])];
    if (!images.length && p.image)
        images.push(p.image);
    const sorted = images.sort((a, b) => (a.position ?? 0) - (b.position ?? 0));
    const inventory = totalInventory(p);
    return {
        id: String(p.id),
        title: p.title,
        handle: p.handle,
        status: p.status,
        vendor: p.vendor,
        productType: p.product_type,
        category: p.product_type?.trim() || 'Uncategorized',
        tags: p.tags,
        bodyHtml: p.body_html ?? '',
        price: v?.price ?? null,
        sku: v?.sku ?? null,
        inventory,
        variantCount: p.variants?.length ?? 1,
        imageUrl: sorted[0]?.src ?? null,
        images: sorted.map((img) => ({
            id: String(img.id),
            src: img.src,
            alt: img.alt,
            position: img.position,
        })),
        variants: (p.variants ?? []).map((v) => mapVariant(v)),
        createdAt: p.created_at,
        updatedAt: p.updated_at,
    };
}
function mapVariant(v) {
    const opt = v.option1 || v.title || '';
    const match = opt.match(/^([\d.]+)\s*(\w+)?$/);
    return {
        id: String(v.id),
        title: v.title,
        option1: opt,
        packSize: match?.[1] ?? opt,
        unit: match?.[2] ?? 'ml',
        price: v.price,
        mrp: v.compare_at_price ?? v.price,
        sku: v.sku ?? '',
        inventory: v.inventory_quantity ?? 0,
    };
}
/** Fetch all products from Shopify (cursor pagination, max 250/page). */
async function fetchAllProducts(search) {
    const searchTerm = search?.trim().toLowerCase();
    if (!searchTerm && productListCache && Date.now() - productListCache.at < CACHE_TTL_MS) {
        return productListCache.items;
    }
    const all = [];
    let pageInfo = null;
    for (let guard = 0; guard < 50; guard++) {
        let path;
        if (pageInfo) {
            path = `/products.json?limit=250&page_info=${encodeURIComponent(pageInfo)}`;
        }
        else {
            path = `/products.json?limit=250&fields=${LIST_FIELDS}`;
        }
        const { data, links } = await shopifyAdminRaw(path);
        const batch = data.products ?? [];
        all.push(...batch);
        if (!links.nextPageInfo)
            break;
        pageInfo = links.nextPageInfo;
    }
    if (!searchTerm) {
        productListCache = { at: Date.now(), items: all };
        return all;
    }
    return all.filter((p) => {
        const hay = `${p.title} ${p.handle} ${p.vendor} ${p.tags} ${p.product_type}`.toLowerCase();
        return hay.includes(searchTerm);
    });
}
function applyListFilters(products, query) {
    let list = products;
    if (query.category?.trim()) {
        const cat = query.category.trim().toLowerCase();
        list = list.filter((p) => (p.product_type?.trim() || 'Uncategorized').toLowerCase() === cat);
    }
    if (query.status?.trim()) {
        list = list.filter((p) => p.status === query.status?.trim());
    }
    return list;
}
function computeStats(products) {
    let active = 0;
    let lowStock = 0;
    let outOfStock = 0;
    for (const p of products) {
        const inv = totalInventory(p);
        if (p.status === 'active')
            active++;
        if (inv === 0)
            outOfStock++;
        else if (inv <= 10)
            lowStock++;
    }
    return {
        total: products.length,
        active,
        lowStock,
        outOfStock,
    };
}
function uniqueCategories(products) {
    const set = new Set();
    for (const p of products) {
        set.add(p.product_type?.trim() || 'Uncategorized');
    }
    return [...set].sort((a, b) => a.localeCompare(b));
}
export const shopifyProductsService = {
    async count() {
        const res = await shopifyAdmin('/products/count.json');
        return res.count ?? 0;
    },
    /** All products with every variant — for inventory grid (uses product list cache). */
    async getInventoryCatalog(search) {
        const all = await fetchAllProducts(search);
        return all.map(mapProduct);
    },
    async list(query) {
        const limit = Math.min(100, Math.max(8, query.limit ?? 8));
        const page = Math.max(1, query.page ?? 1);
        const catalog = await fetchAllProducts(query.search);
        const stats = computeStats(catalog);
        const categories = uniqueCategories(catalog);
        const filtered = applyListFilters(catalog, query);
        const total = filtered.length;
        const pages = Math.max(1, Math.ceil(total / limit));
        const safePage = Math.min(page, pages);
        const start = (safePage - 1) * limit;
        const slice = filtered.slice(start, start + limit);
        return {
            products: slice.map(mapProduct),
            stats,
            categories,
            pagination: {
                page: safePage,
                limit,
                total,
                pages,
            },
        };
    },
    async get(id) {
        try {
            const res = await shopifyAdmin(`/products/${id}.json`);
            return mapProduct(res.product);
        }
        catch {
            throw new NotFoundError('Product not found');
        }
    },
    async saveWizard(id, input) {
        if (!input.title?.trim())
            throw new ValidationError('Product title is required');
        if (!input.variants?.length)
            throw new ValidationError('At least one variant is required');
        const variantRows = input.variants.map((v) => {
            const label = `${v.packSize} ${v.unit}`.trim();
            const sku = v.sku ||
                (input.skuPrefix
                    ? `${input.skuPrefix}-${v.packSize}${v.unit}`.replace(/\s+/g, '')
                    : undefined);
            return {
                option1: label,
                price: String(v.sellingPrice || '0'),
                compare_at_price: String(v.mrp || v.sellingPrice || '0'),
                sku,
                inventory_quantity: Math.max(0, Number(v.stock) || 0),
                id: v.id ? Number(v.id) : undefined,
            };
        });
        const optionValues = variantRows.map((v) => v.option1);
        if (!id) {
            const product = {
                title: input.title.trim(),
                body_html: input.bodyHtml ?? '',
                vendor: input.vendor ?? 'Morbeez',
                product_type: input.productType ?? '',
                tags: input.tags ?? '',
                status: input.status ?? 'draft',
                options: [{ name: 'Pack Size', values: optionValues }],
                variants: variantRows.map(({ id: _id, ...rest }) => rest),
            };
            const res = await shopifyAdmin('/products.json', {
                method: 'POST',
                body: JSON.stringify({ product }),
            });
            clearProductListCache();
            return mapProduct(res.product);
        }
        const existing = await shopifyAdmin(`/products/${id}.json`);
        const p = existing.product;
        const product = {
            id: Number(id),
            title: input.title.trim(),
            body_html: input.bodyHtml ?? p.body_html,
            vendor: input.vendor ?? p.vendor,
            product_type: input.productType ?? p.product_type,
            tags: input.tags ?? p.tags,
            status: input.status ?? p.status,
            options: [{ name: 'Pack Size', values: optionValues }],
            variants: variantRows.map((row, i) => {
                const existingId = row.id ?? p.variants?.[i]?.id;
                return existingId ? { ...row, id: existingId } : row;
            }),
        };
        const res = await shopifyAdmin(`/products/${id}.json`, {
            method: 'PUT',
            body: JSON.stringify({ product }),
        });
        clearProductListCache();
        return mapProduct(res.product);
    },
    async create(input) {
        if (!input.title?.trim())
            throw new ValidationError('Product title is required');
        const product = {
            title: input.title.trim(),
            body_html: input.bodyHtml ?? '',
            vendor: input.vendor ?? 'Morbeez',
            product_type: input.productType ?? '',
            tags: input.tags ?? '',
            status: input.status ?? 'draft',
            variants: [
                {
                    price: input.price ?? '0.00',
                    sku: input.sku ?? undefined,
                    inventory_management: null,
                },
            ],
        };
        const res = await shopifyAdmin('/products.json', {
            method: 'POST',
            body: JSON.stringify({ product }),
        });
        clearProductListCache();
        return mapProduct(res.product);
    },
    async update(id, input) {
        const existing = await shopifyAdmin(`/products/${id}.json`);
        const p = existing.product;
        const variantId = p.variants?.[0]?.id;
        const product = {
            id: Number(id),
            title: input.title ?? p.title,
            body_html: input.bodyHtml ?? p.body_html,
            vendor: input.vendor ?? p.vendor,
            product_type: input.productType ?? p.product_type,
            tags: input.tags ?? p.tags,
            status: input.status ?? p.status,
        };
        if (input.price !== undefined || input.sku !== undefined) {
            product.variants = [
                {
                    id: variantId,
                    price: input.price ?? p.variants[0]?.price,
                    sku: input.sku ?? p.variants[0]?.sku,
                },
            ];
        }
        const res = await shopifyAdmin(`/products/${id}.json`, {
            method: 'PUT',
            body: JSON.stringify({ product }),
        });
        clearProductListCache();
        return mapProduct(res.product);
    },
    async uploadImage(productId, input) {
        const raw = input.dataBase64.replace(/^data:[^;]+;base64,/, '').trim();
        if (!raw)
            throw new ValidationError('Image data is required');
        const image = {
            attachment: raw,
            filename: input.fileName || 'product-image.jpg',
        };
        if (input.alt)
            image.alt = input.alt;
        const res = await shopifyAdmin(`/products/${productId}/images.json`, {
            method: 'POST',
            body: JSON.stringify({ image }),
        });
        clearProductListCache();
        return {
            id: String(res.image.id),
            src: res.image.src,
            alt: res.image.alt,
            position: res.image.position,
        };
    },
    async deleteImage(productId, imageId) {
        await shopifyAdminRaw(`/products/${productId}/images/${imageId}.json`, {
            method: 'DELETE',
        });
        clearProductListCache();
        return { ok: true };
    },
};
//# sourceMappingURL=shopify.products.service.js.map