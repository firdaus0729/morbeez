import { shopifyProductsService } from '../shopify/shopify.products.service.js';
const LOW_STOCK_THRESHOLD = 10;
function stockStatus(qty) {
    if (qty <= 0)
        return 'out_of_stock';
    if (qty <= LOW_STOCK_THRESHOLD)
        return 'low_stock';
    return 'in_stock';
}
function stableBatch(productId, variantId, sku) {
    if (sku?.trim()) {
        const clean = sku.replace(/[^A-Za-z0-9]/g, '').toUpperCase();
        if (clean.length >= 4)
            return clean.slice(0, 10);
    }
    const n = Math.abs(Number(variantId) || 0) + Number(productId) * 7;
    return `BC${String(n % 1000000).padStart(6, '0')}`;
}
function defaultExpiry(variantId) {
    const base = new Date();
    base.setFullYear(base.getFullYear() + 2);
    const seed = Number(variantId) % 180;
    base.setDate(base.getDate() + seed);
    return base.toLocaleDateString('en-IN', { day: '2-digit', month: '2-digit', year: 'numeric' });
}
export const inventoryAdminService = {
    async list(query) {
        const limit = Math.min(100, Math.max(8, query.limit ?? 8));
        const page = Math.max(1, query.page ?? 1);
        const catalog = await shopifyProductsService.getInventoryCatalog(query.search);
        const allRows = [];
        for (const product of catalog) {
            const variants = product.variants?.length ? product.variants : [];
            if (!variants.length) {
                const stock = product.inventory ?? 0;
                const price = Number(product.price || 0);
                const status = stockStatus(stock);
                allRows.push({
                    productId: product.id,
                    variantId: product.id,
                    title: product.title,
                    imageUrl: product.imageUrl,
                    variant: 'Default',
                    batchNo: stableBatch(product.id, product.id, product.sku),
                    expiryDate: defaultExpiry(product.id),
                    stock,
                    status,
                    unitValueInr: price * stock,
                });
                continue;
            }
            for (const v of variants) {
                const stock = v.inventory ?? 0;
                const price = Number(v.price || product.price || 0);
                const status = stockStatus(stock);
                const variantLabel = v.option1 || `${v.packSize || ''} ${v.unit || ''}`.trim() || v.title || 'Default';
                allRows.push({
                    productId: product.id,
                    variantId: v.id,
                    title: product.title,
                    imageUrl: product.imageUrl,
                    variant: variantLabel,
                    batchNo: stableBatch(product.id, v.id, v.sku),
                    expiryDate: defaultExpiry(v.id),
                    stock,
                    status,
                    unitValueInr: price * stock,
                });
            }
        }
        const totalStock = allRows.reduce((s, r) => s + r.stock, 0);
        const totalStockValue = allRows.reduce((s, r) => s + r.unitValueInr, 0);
        const productIdsLow = new Set(allRows.filter((r) => r.status === 'low_stock').map((r) => r.productId));
        const productIdsOut = new Set(allRows.filter((r) => r.status === 'out_of_stock').map((r) => r.productId));
        const rows = query.status && query.status !== 'all'
            ? allRows.filter((r) => r.status === query.status)
            : allRows;
        const total = rows.length;
        const pages = Math.max(1, Math.ceil(total / limit));
        const safePage = Math.min(page, pages);
        const start = (safePage - 1) * limit;
        return {
            rows: rows.slice(start, start + limit),
            stats: {
                totalStockValue: Math.round(totalStockValue),
                totalStock,
                lowStockProducts: productIdsLow.size,
                outOfStockProducts: productIdsOut.size,
            },
            pagination: { page: safePage, limit, total, pages },
        };
    },
};
//# sourceMappingURL=inventory-admin.service.js.map