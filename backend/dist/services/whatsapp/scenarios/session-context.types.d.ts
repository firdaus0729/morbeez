import type { DosageItem } from '../../ai/types.js';
/** JSON stored on conversation_sessions.context */
export interface DiagnosisPending {
    imageCount: number;
    lastSessionId?: string;
    lastAdvisorySummary?: string;
    dosageItems?: DosageItem[];
    technicalOnly?: boolean;
}
export interface SessionContext {
    diagnosis?: DiagnosisPending;
    chimbDrainage?: 'yes' | 'no' | 'unsure';
    activeMenu?: string;
    lastImageHash?: string;
    activeCropType?: string;
    activePlotLabel?: string;
    /** Symptoms text saved while farmer picks a plot (Scenario 29) */
    pendingSymptomsText?: string;
    /** Checkout retry after payment failed (Scenario 36) */
    pendingCheckoutSessionId?: string;
    pendingRazorpayOrderId?: string;
    /** Cultivation follow-ups (30–31) */
    pendingCultivationPrompt?: 'application' | 'result';
    pendingResultActivityId?: string;
    lastAdvisorySessionId?: string;
}
//# sourceMappingURL=session-context.types.d.ts.map