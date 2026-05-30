import type { AdvisoryLanguage } from '../../ai/types.js';
import type { ScenarioSenders } from '../scenarios/whatsapp-scenario-router.service.js';
import type { ConversationState } from '../conversation-session.service.js';
export type RoiEntryType = 'labour' | 'purchase' | 'misc' | 'harvest' | 'income';
export declare const roiFlowService: {
    isRoiButton(id: string): boolean;
    ensureSettings(farmerId: string): Promise<void>;
    alreadyPromptedToday(farmerId: string): Promise<boolean>;
    maybeSendDailyPrompt(params: {
        farmerId: string;
        phone: string;
        language: AdvisoryLanguage;
        send: ScenarioSenders;
        force?: boolean;
    }): Promise<boolean>;
    /**
     * Send 6 PM ROI prompts to all opted-in farmers (worker batch).
     */
    runDailyPromptsBatch(options?: {
        farmerId?: string;
        dryRun?: boolean;
        limit?: number;
    }): Promise<{
        sent: number;
        skipped: number;
        failed: number;
    }>;
    /**
     * If farmer messages after 6 PM IST and has not had today's prompt, nudge once (no duplicate with menu).
     */
    tryEveningPromptOnInbound(params: {
        farmerId: string;
        phone: string;
        language: AdvisoryLanguage;
        sessionState: ConversationState;
        routeHandled: boolean;
        text?: string;
        send: ScenarioSenders;
    }): Promise<boolean>;
    sendEntryMenu(phone: string, language: AdvisoryLanguage, send: ScenarioSenders, options?: {
        intro?: string;
    }): Promise<void>;
    startTracker(params: {
        farmerId: string;
        phone: string;
        language: AdvisoryLanguage;
        send: ScenarioSenders;
    }): Promise<void>;
    handleButton(farmerId: string, phone: string, language: AdvisoryLanguage, buttonId: string, send: ScenarioSenders): Promise<boolean>;
    beginEntry(farmerId: string, type: RoiEntryType, phone: string, language: AdvisoryLanguage, send: ScenarioSenders): Promise<void>;
    recordEntry(params: {
        farmerId: string;
        entryType: RoiEntryType;
        amount: number;
        entryDate: string;
        comments?: string;
    }): Promise<string>;
    finalizePendingEntry(farmerId: string, phone: string, language: AdvisoryLanguage, send: ScenarioSenders, comments?: string): Promise<void>;
    tryHandleInbound(params: {
        farmerId: string;
        phone: string;
        language: AdvisoryLanguage;
        text: string;
        send: ScenarioSenders;
        sessionState: string;
    }): Promise<boolean>;
};
//# sourceMappingURL=roi-flow.service.d.ts.map