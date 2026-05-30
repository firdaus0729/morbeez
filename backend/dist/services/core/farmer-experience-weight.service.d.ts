export type FarmerExperienceStats = {
    farmerId: string;
    correctIdentifications: number;
    totalFeedbackSubmitted: number;
    approvedFeedbackCount: number;
    rejectedFeedbackCount: number;
    recommendationSuccessRate: number | null;
    primaryCropSpecialization: string | null;
    trustScore: number;
};
/** Weight multiplier for promoting farmer-sourced learning (0.5–1.2). */
export declare function trustWeightFromStats(stats: FarmerExperienceStats, cropExperienceYears?: number | null): number;
export declare const farmerExperienceWeightService: {
    getOrCreate(farmerId: string): Promise<FarmerExperienceStats>;
    mapRow(r: Record<string, unknown>): FarmerExperienceStats;
    refreshRecommendationSuccessRate(farmerId: string): Promise<void>;
    onFeedbackSubmitted(farmerId: string, cropType?: string): Promise<void>;
    onFeedbackReviewed(farmerId: string, decision: "approved" | "rejected" | "partial"): Promise<FarmerExperienceStats>;
};
//# sourceMappingURL=farmer-experience-weight.service.d.ts.map