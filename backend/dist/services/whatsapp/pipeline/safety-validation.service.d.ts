import type { StructuredAdvisory } from '../../ai/types.js';
export type SafetyResult = {
    safe: true;
} | {
    safe: false;
    reason: string;
    farmerMessage: string;
};
export declare function validateAdvisorySafety(advisory: StructuredAdvisory, language: string): SafetyResult;
//# sourceMappingURL=safety-validation.service.d.ts.map