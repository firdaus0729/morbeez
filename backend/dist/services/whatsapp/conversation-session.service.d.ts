import type { AdvisoryLanguage } from '../ai/types.js';
export type ConversationOwner = 'ai' | 'telecaller' | 'agronomist';
export type ConversationState = 'language_select' | 'main_menu' | 'onboarding_minimal' | 'diagnosis' | 'root_photos_requested' | 'human_takeover';
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
}
export declare const conversationSessionService: {
    ensureWhatsAppSession(farmerId: string): Promise<ConversationSession>;
    setLanguage(farmerId: string, language: AdvisoryLanguage): Promise<void>;
    setState(farmerId: string, state: ConversationState, patch?: Record<string, unknown>): Promise<void>;
    shouldPauseAi(farmerId: string): Promise<boolean>;
};
//# sourceMappingURL=conversation-session.service.d.ts.map