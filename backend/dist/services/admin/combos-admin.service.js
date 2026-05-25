import { supabase } from '../../lib/supabase.js';
import { throwIfSupabaseError } from '../../lib/supabase-errors.js';
import { NotFoundError, ValidationError } from '../../lib/errors.js';
function calcDiscount(mrp, comboPrice) {
    if (mrp <= 0)
        return 0;
    return Math.round(((mrp - comboPrice) / mrp) * 100);
}
function currentMonthLabel() {
    return new Date().toLocaleDateString('en-IN', { month: 'long' });
}
function mapCombo(row) {
    const mrp = Number(row.mrp);
    const comboPrice = Number(row.combo_price);
    const discount = row.discount_percent > 0 ? row.discount_percent : calcDiscount(mrp, comboPrice);
    const count = row.product_count || 0;
    return {
        id: row.id,
        name: row.name,
        productCount: count,
        productsLabel: `${count} Product${count === 1 ? '' : 's'}`,
        mrp,
        comboPrice,
        discount,
        discountLabel: `${discount}%`,
        status: row.status === 'inactive' ? 'inactive' : 'active',
        salesMtd: Number(row.sales_mtd) || 0,
        description: row.description,
        products: row.products,
    };
}
export const combosAdminService = {
    async list(query) {
        const page = Math.max(1, query.page ?? 1);
        const limit = Math.min(50, Math.max(7, query.limit ?? 7));
        const statusFilter = query.status ?? 'all';
        const { data, error } = await supabase
            .from('commerce_combos')
            .select('*')
            .order('created_at', { ascending: false });
        throwIfSupabaseError(error, 'Could not load combos');
        let combos = (data ?? []).map((r) => mapCombo(r));
        if (query.search?.trim()) {
            const term = query.search.trim().toLowerCase();
            combos = combos.filter((c) => c.name.toLowerCase().includes(term) ||
                (c.description && c.description.toLowerCase().includes(term)));
        }
        if (statusFilter !== 'all') {
            combos = combos.filter((c) => c.status === statusFilter);
        }
        const allRows = (data ?? []).map((r) => mapCombo(r));
        const stats = {
            total: allRows.length,
            active: allRows.filter((c) => c.status === 'active').length,
            inactive: allRows.filter((c) => c.status === 'inactive').length,
            totalSalesMtd: allRows.reduce((s, c) => s + c.salesMtd, 0),
            salesMonthLabel: currentMonthLabel(),
        };
        const total = combos.length;
        const pages = Math.max(1, Math.ceil(total / limit));
        const safePage = Math.min(page, pages);
        const start = (safePage - 1) * limit;
        return {
            combos: combos.slice(start, start + limit),
            stats,
            pagination: { page: safePage, limit, total, pages },
        };
    },
    async get(id) {
        const { data, error } = await supabase.from('commerce_combos').select('*').eq('id', id).maybeSingle();
        throwIfSupabaseError(error, 'Could not load combo');
        if (!data)
            throw new NotFoundError('Combo not found');
        return mapCombo(data);
    },
    async create(input) {
        if (input.comboPrice > input.mrp) {
            throw new ValidationError('Combo price cannot exceed MRP');
        }
        const discount = calcDiscount(input.mrp, input.comboPrice);
        const { data, error } = await supabase
            .from('commerce_combos')
            .insert({
            name: input.name.trim(),
            product_count: Math.max(1, input.productCount),
            products: input.products ?? [],
            mrp: input.mrp,
            combo_price: input.comboPrice,
            discount_percent: discount,
            status: input.status ?? 'active',
            description: input.description?.trim() || null,
        })
            .select('*')
            .single();
        throwIfSupabaseError(error, 'Could not create combo');
        return mapCombo(data);
    },
    async update(id, input) {
        const existing = await this.get(id);
        const mrp = input.mrp ?? existing.mrp;
        const comboPrice = input.comboPrice ?? existing.comboPrice;
        if (comboPrice > mrp)
            throw new ValidationError('Combo price cannot exceed MRP');
        const patch = { updated_at: new Date().toISOString() };
        if (input.name != null)
            patch.name = input.name.trim();
        if (input.productCount != null)
            patch.product_count = Math.max(1, input.productCount);
        if (input.mrp != null)
            patch.mrp = input.mrp;
        if (input.comboPrice != null)
            patch.combo_price = input.comboPrice;
        if (input.status != null)
            patch.status = input.status;
        if (input.description != null)
            patch.description = input.description.trim() || null;
        if (input.products != null)
            patch.products = input.products;
        patch.discount_percent = calcDiscount(mrp, comboPrice);
        const { data, error } = await supabase
            .from('commerce_combos')
            .update(patch)
            .eq('id', id)
            .select('*')
            .single();
        throwIfSupabaseError(error, 'Could not update combo');
        return mapCombo(data);
    },
};
//# sourceMappingURL=combos-admin.service.js.map