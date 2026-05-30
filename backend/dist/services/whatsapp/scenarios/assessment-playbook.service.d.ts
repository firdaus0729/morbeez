import type { AdvisoryLanguage } from '../../ai/types.js';
import type { AgricultureInputCategory, ClassificationResult } from '../pipeline/input-classifier.service.js';
export type PlaybookResult = {
    action: 'continue_diagnosis';
} | {
    action: 'reply';
    message: string;
    escalate?: boolean;
};
export declare const assessmentPlaybookService: {
    resolve(classification: ClassificationResult, language: AdvisoryLanguage, options?: {
        hasCropMedia?: boolean;
    }): PlaybookResult;
    applyEscalation(farmerId: string, category: AgricultureInputCategory, notes?: string): Promise<void>;
};
//# sourceMappingURL=assessment-playbook.service.d.ts.map