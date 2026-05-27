import { packOptimizationService } from './pack-optimization.service.js';
/** Scenario 3 — compute product kg from spray water volume. */
export const dosageCalculatorService = {
    /**
     * Parse rate like "500g per 200L" or "1kg per 200L water".
     * Returns grams per 200L baseline.
     */
    parseRatePer200L(rate) {
        const normalized = rate.toLowerCase();
        const gMatch = normalized.match(/(\d+(?:\.\d+)?)\s*g/);
        const kgMatch = normalized.match(/(\d+(?:\.\d+)?)\s*kg/);
        const volMatch = normalized.match(/(\d+)\s*l/);
        const volume = volMatch ? Number(volMatch[1]) : 200;
        let grams = 0;
        if (kgMatch)
            grams = Number(kgMatch[1]) * 1000;
        else if (gMatch)
            grams = Number(gMatch[1]);
        else
            return null;
        return (grams * 200) / volume;
    },
    async calculateForWaterVolume(items, waterLiters) {
        const factor = waterLiters / 200;
        const results = [];
        for (const item of items) {
            const per200 = this.parseRatePer200L(item.rate);
            if (per200 == null)
                continue;
            const requiredKg = (per200 * factor) / 1000;
            const productKey = item.product.toLowerCase().replace(/[^a-z0-9]+/g, '_');
            const optimized = await packOptimizationService.optimizeQuantity(productKey, requiredKg);
            results.push({
                product: item.product,
                requiredKg: Math.round(requiredKg * 100) / 100,
                assignedKg: optimized.assignedKg,
                packLine: packOptimizationService.formatPacks(optimized.packs),
            });
        }
        return results;
    },
};
//# sourceMappingURL=dosage-calculator.service.js.map