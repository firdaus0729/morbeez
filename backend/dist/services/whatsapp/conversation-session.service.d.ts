import type { AdvisoryLanguage } from '../ai/types.js';
import type { SessionContext } from './scenarios/session-context.types.js';
export type ConversationOwner = 'ai' | 'telecaller' | 'agronomist';
export type ConversationState = 'language_select' | 'main_menu' | 'onboarding_minimal' | 'diagnosis' | 'diagnosis_awaiting_photos' | 'diagnosis_water_volume' | 'root_photos_requested' | 'nutrient_soil_confirm' | 'soil_flow' | 'terminology_clarify' | 'chimb_followup' | 'plot_select' | 'crop_select' | 'human_takeover';
export interface ConversationSession {
    id: string;
    farmer_id: string;
    channel: string;
    state: ConversationState;
    preferred_language: AdvisoryLanguage | null;
    conversation_owner: ConversationOwner;
    ai_paused: boolean;
    last_menu_at: string | null;
    last_ai_at: string | null;
    context: SessionContext;
}
export declare const conversationSessionService: {
    ensureWhatsAppSession(farmerId: string): Promise<ConversationSession>;
    getContext(farmerId: string): Promise<SessionContext>;
    patchContext(farmerId: string, patch: Partial<SessionContext>): Promise<SessionContext>;
    setLanguage(farmerId: string, language: AdvisoryLanguage): Promise<void>;
    setState(farmerId: string, state: ConversationState, patch?: Record<string, unknown>): Promise<void>;
    clearActivePlot(farmerId: string): Promise<void>;
    shouldPauseAi(farmerId: string): Promise<boolean>;
};
//# sourceMappingURL=conversation-session.service.d.ts.map