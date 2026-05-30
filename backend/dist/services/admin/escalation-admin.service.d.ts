export declare const escalationAdminService: {
    list(params: {
        status?: string;
        page?: number;
        limit?: number;
    }): Promise<{
        items: {
            id: any;
            sessionId: any;
            farmerId: any;
            farmerName: string;
            farmerPhone: {} | null;
            cropType: {} | null;
            language: {};
            reason: any;
            confidence: any;
            priority: any;
            status: any;
            assignedTo: any;
            createdAt: any;
            createdLabel: string | null;
        }[];
        total: number;
        page: number;
        limit: number;
    }>;
    getById(id: string): Promise<{
        id: any;
        sessionId: any;
        farmerId: string;
        farmer: {
            id: unknown;
            name: string;
            phone: unknown;
            district: unknown;
            language: unknown;
        } | null;
        reason: any;
        confidence: any;
        priority: any;
        status: any;
        assignedTo: any;
        agronomistNotes: any;
        resolution: any;
        correction: any;
        resolvedAt: any;
        createdAt: any;
        createdLabel: string | null;
        session: {
            cropType: unknown;
            cropStage: unknown;
            symptomsText: unknown;
            voiceTranscript: unknown;
            summaryEn: unknown;
            summaryMl: unknown;
            probableIssue: unknown;
            treatments: unknown;
            precautions: unknown;
        } | null;
        productRecommendations: {
            title: unknown;
            reason: unknown;
            handle: unknown;
        }[];
    }>;
    update(id: string, body: {
        status?: string;
        assignedTo?: string;
        agronomistNotes?: string;
        resolution?: string;
        correction?: Record<string, unknown>;
    }, agentEmail: string): Promise<{
        id: any;
        sessionId: any;
        farmerId: string;
        farmer: {
            id: unknown;
            name: string;
            phone: unknown;
            district: unknown;
            language: unknown;
        } | null;
        reason: any;
        confidence: any;
        priority: any;
        status: any;
        assignedTo: any;
        agronomistNotes: any;
        resolution: any;
        correction: any;
        resolvedAt: any;
        createdAt: any;
        createdLabel: string | null;
        session: {
            cropType: unknown;
            cropStage: unknown;
            symptomsText: unknown;
            voiceTranscript: unknown;
            summaryEn: unknown;
            summaryMl: unknown;
            probableIssue: unknown;
            treatments: unknown;
            precautions: unknown;
        } | null;
        productRecommendations: {
            title: unknown;
            reason: unknown;
            handle: unknown;
        }[];
    }>;
    countPending(): Promise<number>;
};
//# sourceMappingURL=escalation-admin.service.d.ts.map