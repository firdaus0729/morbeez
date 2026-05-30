export type FarmerHealthSnapshot = {
    score: number;
    band: 'healthy' | 'watch' | 'at_risk';
    factors: string[];
};
/**
 * Lightweight engagement health for telecaller prioritization (computed, not stored).
 */
export declare const farmerHealthScoreService: {
    compute(farmerId: string): Promise<FarmerHealthSnapshot>;
    telecallerPriorityFromHealth(band: FarmerHealthSnapshot["band"]): "normal" | "high";
};
//# sourceMappingURL=farmer-health-score.service.d.ts.map