type RecRow = {
    id: string;
    farmer_id: string;
    block_id: string | null;
    ai_session_id: string | null;
    issue_detected: string | null;
    recommendation_text: string;
    products: unknown;
    dosage: string | null;
    application_type: string | null;
    dap_at_recommendation: number | null;
    language: string;
    status: string;
    communicated_at: string | null;
    technical_name: string | null;
    trade_name: string | null;
    severity: string | null;
    metadata?: Record<string, unknown>;
    farmers?: {
        phone: string | null;
        preferred_language: string | null;
    };
    farm_blocks?: {
        crop_type: string | null;
    } | null;
};
export type ApplicationReply = 'yes_applied' | 'not_yet' | 'need_clarification';
export type OutcomeReply = 'improved' | 'no_improvement' | 'worsened' | 'partial';
export declare const recommendationFollowUpService: {
    loadRecord(recommendationRecordId: string): Promise<RecRow | null>;
    /** Stage 1 — recommendation communicated; schedule Day-1 application check. */
    onRecommendationCommunicated(recommendationRecordId: string): Promise<void>;
    /** After AI diagnosis — mark latest session rec as communicated and start follow-up. */
    bootstrapFromDiagnosisSession(sessionId: string, farmerId: string): Promise<void>;
    scheduleJob(params: {
        farmerId: string;
        recommendationRecordId: string;
        jobType: string;
        scheduledAt: string;
        payload?: Record<string, unknown>;
        sessionId?: string | null;
    }): Promise<void>;
    sendApplicationCheck(recommendationRecordId: string): Promise<boolean>;
    sendApplicationReminder(recommendationRecordId: string, reminderCount: number): Promise<void>;
    sendOutcomeCheck(recommendationRecordId: string): Promise<boolean>;
    handleApplicationReply(farmerId: string, recommendationRecordId: string, reply: ApplicationReply): Promise<string>;
    handleOutcomeReply(farmerId: string, recommendationRecordId: string, reply: OutcomeReply): Promise<string>;
    resolvePendingRecommendationId(farmerId: string): Promise<string | null>;
    processAutomationJob(job: {
        farmer_id: string;
        job_type: string;
        payload: Record<string, unknown>;
    }): Promise<void>;
    escalateNoApplicationConfirmation(farmerId: string, recommendationRecordId: string, rec: RecRow | null): Promise<void>;
    escalateNoImprovement(farmerId: string, recommendationRecordId: string, rec: RecRow): Promise<void>;
    escalateWorsened(farmerId: string, rec: RecRow): Promise<void>;
    scheduleNoResponseEscalation(recommendationRecordId: string, farmerId: string): Promise<void>;
    getTelecallerFollowUpDetail(recommendationRecordId: string): Promise<{
        recommendation: RecRow;
        application: any;
        followUps: any[];
        session: {
            id: any;
            confidence_score: any;
            status: any;
            created_at: any;
        } | null;
        escalationStatus: boolean;
    } | null>;
    getKpis(days?: number): Promise<{
        periodDays: number;
        recommendationsCommunicated: number;
        applicationRatePct: number;
        outcomeRecorded: number;
        successRatePct: number;
        pendingScheduledFollowUps: number;
        noResponseFarmers: number;
    }>;
    upsertLearningSample(rec: RecRow, patch: {
        applicationConfirmed?: boolean;
        outcome?: string;
        escalated?: boolean;
    }): Promise<void>;
    buildBlockTimelineEvents(blockId: string, farmerId: string): Promise<{
        title: string;
        at: string;
        kind: string;
        detail?: string;
    }[]>;
};
export {};
//# sourceMappingURL=recommendation-follow-up.service.d.ts.map