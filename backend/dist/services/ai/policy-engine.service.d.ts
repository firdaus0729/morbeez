import type { StructuredAdvisory } from './types.js';
export type WeatherRiskBand = 'low' | 'moderate' | 'high';
export type PolicyAssessment = {
    cropHealthScore: number;
    diseaseSeverity: 'low' | 'moderate' | 'high';
    stressSeverity: 'low' | 'moderate' | 'high';
    weatherRiskScore: number;
    weatherRiskBand: WeatherRiskBand;
    confidenceBand: 'high' | 'medium' | 'low';
    needsValidationQuestion: boolean;
    shouldRequestMoreEvidence: boolean;
    escalationPriority: 'normal' | 'high' | 'urgent';
    safetyNotes: string[];
};
export declare const policyEngineService: {
    evaluate(advisory: StructuredAdvisory, contextPack?: {
        weatherRiskScore?: number;
        heavyRainLikely?: boolean;
        highHeatLikely?: boolean;
    }): PolicyAssessment;
};
//# sourceMappingURL=policy-engine.service.d.ts.map