type RecRow = {
    id: string;
    farmer_id: string;
    issue_detected: string | null;
    recommendation_text: string;
    dosage: string | null;
    application_type: string | null;
    weather_warning: string | null;
    language: string;
    status: string;
    communicated_at?: string | null;
    metadata?: Record<string, unknown>;
    farmers?: {
        phone: string | null;
        name: string | null;
        preferred_language: string | null;
    };
};
export declare function buildApprovedRecommendationMessage(row: RecRow): string;
export declare const recommendationCommunicationService: {
    sendApprovedRecommendation(recommendationId: string, options?: {
        force?: boolean;
    }): Promise<{
        sent: boolean;
        message?: string;
        reason?: string;
    }>;
};
export {};
//# sourceMappingURL=recommendation-communication.service.d.ts.map