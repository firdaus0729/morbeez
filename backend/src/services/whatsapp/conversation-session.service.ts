import { supabase } from '../../lib/supabase.js';
import { logger } from '../../lib/logger.js';
import type { AdvisoryLanguage } from '../ai/types.js';

export type ConversationOwner = 'ai' | 'telecaller' | 'agronomist';
export type ConversationState =
  | 'language_select'
  | 'main_menu'
  | 'onboarding_minimal'
  | 'diagnosis'
  | 'root_photos_requested'
  | 'human_takeover';

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

export const conversationSessionService = {
  async ensureWhatsAppSession(farmerId: string): Promise<ConversationSession> {
    const now = new Date().toISOString();
    const { data, error } = await supabase
      .from('conversation_sessions')
      .upsert(
        {
          farmer_id: farmerId,
          channel: 'whatsapp',
          state: 'language_select',
          updated_at: now,
        },
        { onConflict: 'farmer_id,channel' }
      )
      .select(
        'id, farmer_id, channel, state, preferred_language, conversation_owner, ai_paused, last_menu_at, last_ai_at'
      )
      .single();

    if (error) throw error;
    return data as unknown as ConversationSession;
  },

  async setLanguage(farmerId: string, language: AdvisoryLanguage): Promise<void> {
    const now = new Date().toISOString();
    await supabase
      .from('conversation_sessions')
      .update({ preferred_language: language, state: 'main_menu', updated_at: now })
      .eq('farmer_id', farmerId)
      .eq('channel', 'whatsapp');

    // Also persist on farmer profile for global use.
    await supabase
      .from('farmers')
      .update({ preferred_language: language, updated_at: now })
      .eq('id', farmerId);
  },

  async setState(farmerId: string, state: ConversationState, patch?: Record<string, unknown>): Promise<void> {
    const now = new Date().toISOString();
    const payload = { state, updated_at: now, ...(patch ?? {}) };
    const { error } = await supabase
      .from('conversation_sessions')
      .update(payload)
      .eq('farmer_id', farmerId)
      .eq('channel', 'whatsapp');
    if (error) {
      logger.error({ error, farmerId, state }, 'Failed to update conversation session');
    }
  },

  async shouldPauseAi(farmerId: string): Promise<boolean> {
    const { data } = await supabase
      .from('conversation_sessions')
      .select('ai_paused, conversation_owner')
      .eq('farmer_id', farmerId)
      .eq('channel', 'whatsapp')
      .maybeSingle();

    return Boolean(data?.ai_paused) || (data?.conversation_owner && data.conversation_owner !== 'ai');
  },
};

