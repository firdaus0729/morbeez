export type FollowupOutcome = 'improved' | 'partial' | 'no_improvement' | 'worsened';
export declare const accuracyMetricsService: {
    logDiagnosisEvent(params: {
        sessionId: string;
        farmerId: string;
        cropType: string;
        confidence: number;
        escalated: boolean;
        source: "whatsapp" | "api" | "web";
        weatherRisk?: "low" | "moderate" | "high";
    }): Promise<void>;
    logFollowupOutcome(params: {
        farmerId: string;
        sessionId?: string;
        outcome: FollowupOutcome;
        notes?: string;
    }): Promise<void>;
};
//# sourceMappingURL=accuracy-metrics.service.d.ts.map