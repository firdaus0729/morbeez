import type { PlantIdHealthResult, StructuredAdvisory } from './types.js';
export declare function getEscalationThreshold(): number;
/** Merge Plant.id signal with GPT self-reported confidence */
export declare function computeConfidence(gptConfidence: number, plantId?: PlantIdHealthResult | null): number;
export declare function shouldEscalate(confidence: number, advisory: StructuredAdvisory): boolean;
export declare function escalationReason(confidence: number, advisory: StructuredAdvisory): string;
//# sourceMappingURL=confidence.d.ts.map