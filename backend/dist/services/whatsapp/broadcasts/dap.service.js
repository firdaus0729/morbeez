/** Days After Planting from farmer_crops.planted_at or created_at. */
export function computeDap(plantedAt, createdAt) {
    const base = plantedAt
        ? new Date(plantedAt)
        : createdAt
            ? new Date(createdAt)
            : new Date();
    const start = new Date(base.toISOString().slice(0, 10));
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    start.setHours(0, 0, 0, 0);
    return Math.max(0, Math.floor((today.getTime() - start.getTime()) / (24 * 60 * 60 * 1000)));
}
export function dapInTargetRange(dap, rule) {
    if (rule.min_dap != null && rule.max_dap != null) {
        return dap >= rule.min_dap && dap <= rule.max_dap;
    }
    if (rule.target_dap == null)
        return false;
    const tol = rule.dap_tolerance ?? 3;
    return dap >= rule.target_dap - tol && dap <= rule.target_dap + tol;
}
/** Monday = 1 … Sunday = 7 (ISO weekday) */
export function todayIsoWeekday() {
    const d = new Date().getDay();
    return d === 0 ? 7 : d;
}
//# sourceMappingURL=dap.service.js.map