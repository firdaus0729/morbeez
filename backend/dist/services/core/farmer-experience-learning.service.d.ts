export type FarmerFeedbackStatus = 'pending_capture' | 'pending_review' | 'approved' | 'rejected' | 'partial';
export type FarmerFeedbackRow = {
    id: string;
    farmer_id: string;
    session_id: string | null;
    block_id: string | null;
    ai_probable_issue: string | null;
    ai_confidence: number | null;
    farmer_suggested_diagnosis: string | null;
    farmer_prior_experience: string | null;
    farmer_prior_product: string | null;
    farmer_prior_outcome: string | null;
    crop_experience_years: number | null;
    status: FarmerFeedbackStatus;
    capture_step: string | null;
    agronomist_final_diagnosis: string | null;
    agronomist_notes: string | null;
    reviewed_by: string | null;
    reviewed_at: string | null;
    escalation_id: string | null;
    confidence_adjustment: number | null;
    metadata: Record<string, unknown>;
    created_at: string;
    updated_at: string;
};
export declare const farmerExperienceLearningService: {
    createFromDisagreement(params: {
        farmerId: string;
        sessionId: string | null;
        blockId?: string | null;
        aiProbableIssue?: string | null;
        aiConfidence?: number | null;
        initialFarmerDiagnosis?: string | null;
        initialText?: string;
    }): Promise<FarmerFeedbackRow>;
    updateCapture(id: string, patch: Partial<FarmerFeedbackRow>): Promise<FarmerFeedbackRow>;
    submitForReview(feedbackId: string): Promise<FarmerFeedbackRow>;
    getById(id: string): Promise<FarmerFeedbackRow>;
    listPendingReview(limit?: number): Promise<Array<FarmerFeedbackRow & {
        farmer?: {
            name: string | null;
            phone: string | null;
            district: string | null;
        };
        session?: {
            crop_type: string | null;
            symptoms_text: string | null;
        };
    }>>;
    getDetail(id: string): Promise<{
        feedback: FarmerFeedbackRow;
        block: {
            name: string;
            crop_type: string;
            dap: number | null;
        } | null;
        session: {
            id: string;
            cropType: string | null;
            cropStage: string | null;
            symptomsText: string | null;
            voiceTranscript: string | null;
            confidence: number | null;
            createdAt: string | null;
            imageStoragePath: string | null;
            imageUrl: string | null;
        } | null;
        sessionImages: {
            id: string;
            messageType: string;
            at: string;
            caption: string | null;
        }[];
        weatherSummary: string | null;
        experienceStats: import("./farmer-experience-weight.service.js").FarmerExperienceStats;
        farmerProfile: {
            cropExperienceYears: number | null;
            district: string | null;
            village: string | null;
            pincode: string | null;
        } | null;
        aiOutput: {
            probableIssue: unknown;
            summaryEn: unknown;
            summaryMl: unknown;
            treatments: unknown;
        } | null;
        similarApproved: {
            id: any;
            farmer_suggested_diagnosis: any;
            farmer_prior_product: any;
            status: any;
            created_at: any;
        }[];
        consoleSessionUrl: string | null;
    }>;
    review(id: string, body: {
        decision: "approved" | "rejected" | "partial";
        agronomistFinalDiagnosis?: string;
        agronomistNotes?: string;
        confidenceAdjustment?: number;
        updatedRecommendation?: string;
    }, agentEmail: string): Promise<FarmerFeedbackRow>;
    getVerifiedRegionalHints(farmerId: string, cropType: string): Promise<string | null>;
    saveCropExperienceYears(farmerId: string, years: number, feedbackId?: string): Promise<void>;
    promoteToVerifiedLearning(fb: FarmerFeedbackRow, agentEmail: string): Promise<void>;
};
//# sourceMappingURL=farmer-experience-learning.service.d.ts.map