/** Days After Planting from farmer_crops.planted_at or created_at. */
export declare function computeDap(plantedAt: string | Date | null, createdAt?: string | null): number;
export declare function dapInTargetRange(dap: number, rule: {
    target_dap: number | null;
    dap_tolerance: number;
    min_dap: number | null;
    max_dap: number | null;
}): boolean;
/** Monday = 1 … Sunday = 7 (ISO weekday) */
export declare function todayIsoWeekday(): number;
//# sourceMappingURL=dap.service.d.ts.map