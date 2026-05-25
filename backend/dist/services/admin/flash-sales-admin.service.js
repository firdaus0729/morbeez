import { supabase } from '../../lib/supabase.js';
import { throwIfSupabaseError } from '../../lib/supabase-errors.js';
import { NotFoundError, ValidationError } from '../../lib/errors.js';
function calcDiscount(original, flash) {
    if (original <= 0)
        return 0;
    return Math.round(((original - flash) / original) * 100);
}
function resolveStatus(startsAt, endsAt) {
    const now = Date.now();
    const start = new Date(startsAt).getTime();
    const end = new Date(endsAt).getTime();
    if (now < start)
        return 'upcoming';
    if (now > end)
        return 'completed';
    return 'live';
}
function formatSchedule(iso) {
    return new Date(iso).toLocaleString('en-IN', {
        day: 'numeric',
        month: 'short',
        hour: 'numeric',
        minute: '2-digit',
        hour12: true,
    });
}
function currentMonthLabel() {
    return new Date().toLocaleDateString('en-IN', { month: 'long' });
}
function mapFlash(row) {
    const original = Number(row.original_price);
    const flash = Number(row.flash_price);
    const discount = row.discount_percent > 0 ? row.discount_percent : calcDiscount(original, flash);
    const status = resolveStatus(row.starts_at, row.ends_at);
    const stockTotal = row.stock_total || 0;
    const stockSold = Math.min(row.stock_sold || 0, stockTotal);
    const stockLeft = Math.max(0, stockTotal - stockSold);
    const soldPct = stockTotal > 0 ? Math.round((stockSold / stockTotal) * 100) : 0;
    return {
        id: row.id,
        productName: row.product_name,
        imageUrl: row.image_url,
        flashPrice: flash,
        originalPrice: original,
        discount,
        discountLabel: `${discount}% OFF`,
        status,
        startsAt: row.starts_at,
        endsAt: row.ends_at,
        startLabel: formatSchedule(row.starts_at),
        endLabel: formatSchedule(row.ends_at),
        stockTotal,
        stockSold,
        stockLeft,
        soldPct,
        salesMtd: Number(row.sales_mtd) || 0,
        description: row.description,
        shopifyProductId: row.shopify_product_id,
    };
}
export const flashSalesAdminService = {
    async list(query) {
        const page = Math.max(1, query.page ?? 1);
        const limit = Math.min(100, Math.max(4, query.limit ?? 4));
        const tab = query.tab ?? 'all';
        const { data, error } = await supabase
            .from('commerce_flash_sales')
            .select('*')
            .order('starts_at', { ascending: false });
        throwIfSupabaseError(error, 'Could not load flash sales');
        const all = (data ?? []).map((r) => mapFlash(r));
        const tabCounts = {
            all: all.length,
            live: all.filter((s) => s.status === 'live').length,
            upcoming: all.filter((s) => s.status === 'upcoming').length,
            completed: all.filter((s) => s.status === 'completed').length,
        };
        const stats = {
            activeSales: tabCounts.live,
            upcoming: tabCounts.upcoming,
            completed: tabCounts.completed,
            totalSalesMtd: all.reduce((s, f) => s + f.salesMtd, 0),
            salesMonthLabel: currentMonthLabel(),
        };
        const filtered = tab === 'all' ? all : all.filter((s) => s.status === tab);
        const total = filtered.length;
        const pages = Math.max(1, Math.ceil(total / limit));
        const safePage = Math.min(page, pages);
        const start = (safePage - 1) * limit;
        return {
            sales: filtered.slice(start, start + limit),
            tabCounts,
            stats,
            pagination: { page: safePage, limit, total, pages },
        };
    },
    async get(id) {
        const { data, error } = await supabase
            .from('commerce_flash_sales')
            .select('*')
            .eq('id', id)
            .maybeSingle();
        throwIfSupabaseError(error, 'Could not load flash sale');
        if (!data)
            throw new NotFoundError('Flash sale not found');
        return mapFlash(data);
    },
    async create(input) {
        if (new Date(input.endsAt) <= new Date(input.startsAt)) {
            throw new ValidationError('End time must be after start time');
        }
        if (input.flashPrice > input.originalPrice) {
            throw new ValidationError('Flash price cannot exceed original price');
        }
        const discount = calcDiscount(input.originalPrice, input.flashPrice);
        const { data, error } = await supabase
            .from('commerce_flash_sales')
            .insert({
            product_name: input.productName.trim(),
            image_url: input.imageUrl?.trim() || null,
            flash_price: input.flashPrice,
            original_price: input.originalPrice,
            discount_percent: discount,
            starts_at: input.startsAt,
            ends_at: input.endsAt,
            stock_total: Math.max(1, input.stockTotal),
            description: input.description?.trim() || null,
            shopify_product_id: input.shopifyProductId?.trim() || null,
        })
            .select('*')
            .single();
        throwIfSupabaseError(error, 'Could not create flash sale');
        return mapFlash(data);
    },
};
//# sourceMappingURL=flash-sales-admin.service.js.map