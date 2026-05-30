import type { AdvisoryLanguage } from '../../ai/types.js';
import type { InboundMessage } from '../pipeline/types.js';
import { type ConversationSession } from '../conversation-session.service.js';
export type ScenarioSenders = {
    text: (phone: string, text: string) => Promise<void>;
    list?: (params: {
        phone: string;
        body: string;
        buttonText: string;
        sections: Array<{
            title: string;
            rows: Array<{
                id: string;
                title: string;
                description?: string;
            }>;
        }>;
    }) => Promise<void>;
    buttons?: (params: {
        phone: string;
        body: string;
        buttons: Array<{
            id: string;
            title: string;
        }>;
    }) => Promise<void>;
};
export type ScenarioCapture = {
    farmerId: string;
    phone: string;
    language: AdvisoryLanguage;
    isPremium: boolean;
};
export type ScenarioRouterResult = {
    handled: true;
} | {
    handled: false;
} | {
    handled: true;
    runDiagnosis: true;
    welcomePrefix?: string;
} | {
    handled: true;
    duplicateImage: true;
};
export declare const whatsappScenarioRouter: {
    askSoilReportConfirmation(phone: string, farmerId: string, lang: AdvisoryLanguage, send: ScenarioSenders): Promise<void>;
    startMinimalOnboarding(phone: string, farmerId: string, lang: AdvisoryLanguage, send: ScenarioSenders): Promise<void>;
    sendAcreageOnboardingStep(phone: string, lang: AdvisoryLanguage, send: ScenarioSenders): Promise<void>;
    sendPlotPicker(phone: string, farmerId: string, lang: AdvisoryLanguage, send: ScenarioSenders, pendingText?: string): Promise<void>;
    applyPlotSelection(msg: InboundMessage, captured: ScenarioCapture, lang: AdvisoryLanguage, plotId: string, send: ScenarioSenders): Promise<void>;
    tryRoute(msg: InboundMessage, captured: ScenarioCapture, session: ConversationSession, send: ScenarioSenders): Promise<ScenarioRouterResult>;
    showReturningFarmerWelcome(msg: InboundMessage, captured: ScenarioCapture, lang: AdvisoryLanguage, send: ScenarioSenders): Promise<void>;
    showMainMenu(phone: string, lang: AdvisoryLanguage, send: ScenarioSenders, options?: {
        includeTrackOrder?: boolean;
        welcomeOverride?: string;
        returningQuickActionsOnly?: boolean;
    }): Promise<void>;
    showMoreMenu(phone: string, lang: AdvisoryLanguage, send: ScenarioSenders): Promise<void>;
    handleMenuSelection(msg: InboundMessage, captured: ScenarioCapture, lang: AdvisoryLanguage, menuId: string, send: ScenarioSenders): Promise<void>;
    handleSoilAction(msg: InboundMessage, captured: ScenarioCapture, lang: AdvisoryLanguage, action: string, send: ScenarioSenders): Promise<void>;
    handleSoilLabEntry(msg: InboundMessage, captured: ScenarioCapture, lang: AdvisoryLanguage, text: string, send: ScenarioSenders): Promise<boolean>;
    handleWaterVolume(msg: InboundMessage, captured: ScenarioCapture, lang: AdvisoryLanguage, text: string, send: ScenarioSenders): Promise<boolean>;
    afterDiagnosis(params: {
        phone: string;
        farmerId: string;
        lang: AdvisoryLanguage;
        sessionId: string;
        advisory: import("../../ai/types.js").StructuredAdvisory;
        summary: string;
        send: ScenarioSenders;
        hasProductRecommendations?: boolean;
        skipNutrientSoilAsk?: boolean;
    }): Promise<void>;
};
//# sourceMappingURL=whatsapp-scenario-router.service.d.ts.map