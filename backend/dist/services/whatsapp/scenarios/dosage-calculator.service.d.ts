import type { DosageItem } from '../../ai/types.js';
/** Scenario 3 — compute product kg from spray water volume. */
export declare const dosageCalculatorService: {
    /**
     * Parse rate like "500g per 200L" or "1kg per 200L water".
     * Returns grams per 200L baseline.
     */
    parseRatePer200L(rate: string): number | null;
    calculateForWaterVolume(items: DosageItem[], waterLiters: number): Promise<Array<{
        product: string;
        requiredKg: number;
        assignedKg: number;
        packLine: string;
    }>>;
};
//# sourceMappingURL=dosage-calculator.service.d.ts.map