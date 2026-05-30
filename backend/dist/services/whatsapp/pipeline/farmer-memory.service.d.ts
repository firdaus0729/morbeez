import type { AdvisoryLanguage } from '../../ai/types.js';
export type FarmerMemorySnapshot = {
    farmerId: string;
    cropType: string;
    cropStage?: string;
    activePlotId: string | null;
    activePlotLabel?: string;
    dap?: number;
    district?: string;
    recentIssues: string;
    lastSpray?: string;
    lastAdvisorySummary?: string;
    /** Chronological WhatsApp turns (Farmer / Assistant). */
    recentTurns: string[];
    /** Crop is known from plot, session, onboarding, or recent chat — do not re-ask. */
    knownCropLocked: boolean;
    onboardingComplete: boolean;
};
export declare const farmerMemoryService: {
    build(farmerId: string, options?: {
        symptomsText?: string;
        activePlotId?: string | null;
    }): Promise<FarmerMemorySnapshot>;
    formatCompactHistory(memory: FarmerMemorySnapshot): string;
    formatConversationBlock(memory: FarmerMemorySnapshot, maxTurns?: number): string;
    knowsCrop(memory: FarmerMemorySnapshot): boolean;
    memoryAwareFallback(memory: FarmerMemorySnapshot, language: AdvisoryLanguage): string;
};
//# sourceMappingURL=farmer-memory.service.d.ts.map