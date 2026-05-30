type AiDiagnosisRow = {
    label: string;
    confidence: number;
};
export declare const agronomistCaseReviewService: {
    listQueue(params: {
        status?: string;
        sort?: "priority" | "newest";
        page?: number;
        limit?: number;
    }): Promise<{
        items: {
            id: any;
            caseRef: string;
            farmerName: string;
            farmerPhone: {} | null;
            cropType: {};
            dap: number | null;
            confidence: number | null;
            priority: any;
            status: any;
            reason: any;
            createdAt: any;
            createdLabel: string | null;
            timeAgo: string;
            farmerDisagrees: boolean;
            feedbackId: any;
        }[];
        total: number;
        page: number;
        limit: number;
    }>;
    getCaseDetail(escalationId: string): Promise<{
        escalation: {
            id: any;
            farmerId: string;
            caseRef: string;
            sessionId: any;
            status: any;
            priority: any;
            reason: any;
            confidence: any;
            createdAt: any;
            createdLabel: string | null;
            timeAgo: string;
            agronomistNotes: any;
            correction: any;
        };
        farmer: {
            id: unknown;
            name: string;
            phone: unknown;
            district: unknown;
            language: unknown;
        } | null;
        block: {
            id: string;
            name: string;
            cropType: string;
            dap: number;
        } | null;
        location: {
            district: {} | null;
            village: string | null;
            state: string | null;
            weatherSummary: string | null;
        };
        images: {
            id: string;
            url: string | null;
            caption: string | null;
            at: string;
        }[];
        ai: {
            topDiagnoses: AiDiagnosisRow[];
            summary: string;
            probableIssue: string | null;
            confidence: any;
            treatments: unknown;
            precautions: unknown;
        };
        confidenceBreakdown: {
            label: string;
            score: number;
        }[];
        context: {
            lastSpray: {
                product: any;
                dosage: any;
                at: string | null;
                appliedAt: string;
            } | null;
            soil: {
                ph: {} | null;
                ec: {} | null;
                organicCarbon: {} | null;
                testedAt: string | null;
            } | null;
            previousIssue: {
                issue: any;
                outcome: any;
                status: any;
            } | null;
            rainfallNote: string | null;
        };
        farmerFeedback: {
            id: any;
            status: any;
            disagrees: boolean;
            farmerDiagnosis: any;
            farmerExperience: any;
            farmerProduct: any;
            farmerOutcome: any;
            aiIssue: any;
            cropExperienceYears: number | null;
        } | null;
        productRecommendations: {
            title: unknown;
            reason: unknown;
            handle: unknown;
        }[];
        similarCases: {
            id: any;
            symptomKey: any;
            issueLabel: any;
            district: any;
            dap: any;
        }[];
        existingRecommendation: {
            id: any;
            status: any;
            issue_detected: any;
            recommendation_text: any;
        } | null;
        timeline: {
            at: string | null;
            label: string;
            status: "done" | "pending";
            kind: "whatsapp" | "ai" | "farmer" | "pending";
        }[];
    }>;
    submitReview(escalationId: string, body: {
        action: "approve_ai" | "correct_ai" | "partial_match" | "escalate_urgent";
        correctDiagnosis?: string;
        severity?: "mild" | "moderate" | "severe";
        recommendationText?: string;
        dosage?: string;
        notesForLearning?: string;
        submitForApproval?: boolean;
    }, agentEmail: string): Promise<{
        escalationId: string;
        recommendationId: string;
        submittedForApproval: boolean;
    }>;
};
export {};
//# sourceMappingURL=agronomist-case-review.service.d.ts.map