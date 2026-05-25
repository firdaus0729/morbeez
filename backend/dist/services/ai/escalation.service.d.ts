import type { PlantIdHealthResult, StructuredAdvisory } from './types.js';
export declare const escalationService: {
    createIfNeeded(params: {
        sessionId: string;
        farmerId: string;
        advisory: StructuredAdvisory;
        plantId?: PlantIdHealthResult | null;
    }): Promise<{
        escalated: boolean;
        escalationId?: string;
        confidence: number;
    }>;
};
//# sourceMappingURL=escalation.service.d.ts.map