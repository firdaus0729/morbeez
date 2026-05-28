export type RecommendationStatus = 'draft' | 'pending_approval' | 'approved' | 'rejected' | 'communicated' | 'applied' | 'outcome_recorded' | 'cancelled';
export declare const recommendationRecordsService: {
    create(input: {
        farmerId: string;
        blockId?: string;
        leadId?: string;
        aiSessionId?: string;
        crmRecommendationId?: string;
        fieldFindingId?: string;
        source: "ai" | "agronomist" | "rule" | "template" | "field_finding";
        issueDetected?: string;
        recommendationText: string;
        products?: unknown[];
        dosage?: string;
        applicationType?: string;
        weatherWarning?: string;
        language?: string;
        createdBy?: string;
        status?: RecommendationStatus;
        technicalName?: string;
        tradeName?: string;
        severity?: "low" | "medium" | "high";
    }): Promise<any>;
    submitForApproval(id: string, reviewedBy?: string): Promise<any>;
    approve(id: string, approvedBy: string): Promise<any>;
    reject(id: string, approvedBy: string, notes?: string): Promise<any>;
    recordOutcome(id: string, outcome: "better" | "partial" | "no_improvement" | "unknown", notes?: string): Promise<any>;
    listPendingApproval(limit?: number): Promise<any[]>;
    getById(id: string): Promise<any>;
    updateDraft(id: string, patch: {
        issueDetected?: string;
        recommendationText?: string;
        products?: unknown[];
        dosage?: string;
        applicationType?: string;
        weatherWarning?: string;
        language?: string;
        blockId?: string;
    }): Promise<any>;
    listByStatus(status: RecommendationStatus | RecommendationStatus[], limit?: number): Promise<any[]>;
    listByFarmer(farmerId: string, limit?: number): Promise<any[]>;
};
//# sourceMappingURL=recommendation-records.service.d.ts.map