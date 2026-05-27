/** Scenario 4 — round required kg up to available pack sizes. */
export declare const packOptimizationService: {
    optimizeQuantity(productKey: string, requiredKg: number): Promise<{
        requiredKg: number;
        assignedKg: number;
        packs: Array<{
            packKg: number;
            count: number;
        }>;
    }>;
    formatPacks(packs: Array<{
        packKg: number;
        count: number;
    }>): string;
};
//# sourceMappingURL=pack-optimization.service.d.ts.map