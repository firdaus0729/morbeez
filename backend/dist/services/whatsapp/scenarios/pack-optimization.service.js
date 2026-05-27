import { supabase } from '../../../lib/supabase.js';
/** Scenario 4 — round required kg up to available pack sizes. */
export const packOptimizationService = {
    async optimizeQuantity(productKey, requiredKg) {
        const key = productKey.toLowerCase().replace(/\s+/g, '_').slice(0, 64);
        let { data: packs } = await supabase
            .from('product_pack_sizes')
            .select('pack_kg')
            .eq('product_key', key)
            .eq('active', true)
            .order('pack_kg', { ascending: true });
        if (!packs?.length) {
            const { data: generic } = await supabase
                .from('product_pack_sizes')
                .select('pack_kg')
                .eq('product_key', 'generic')
                .eq('active', true)
                .order('pack_kg', { ascending: true });
            packs = generic ?? [{ pack_kg: 1 }];
        }
        const sizes = packs.map((p) => Number(p.pack_kg)).filter((n) => n > 0);
        const largest = sizes[sizes.length - 1] ?? 1;
        let remaining = requiredKg;
        const result = [];
        for (let i = sizes.length - 1; i >= 0 && remaining > 0.001; i--) {
            const pack = sizes[i];
            const count = Math.floor(remaining / pack);
            if (count > 0) {
                result.unshift({ packKg: pack, count });
                remaining -= count * pack;
            }
        }
        if (remaining > 0.001) {
            result.push({ packKg: largest, count: 1 });
            remaining = 0;
        }
        const assignedKg = result.reduce((sum, p) => sum + p.packKg * p.count, 0);
        return {
            requiredKg,
            assignedKg: assignedKg || Math.ceil(requiredKg / largest) * largest,
            packs: result.length ? result : [{ packKg: largest, count: Math.ceil(requiredKg / largest) }],
        };
    },
    formatPacks(packs) {
        return packs.map((p) => `${p.count}×${p.packKg}kg`).join(', ');
    },
};
//# sourceMappingURL=pack-optimization.service.js.map