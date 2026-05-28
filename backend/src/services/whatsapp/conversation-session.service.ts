import { supabase } from '../../lib/supabase.js';
import { logger } from '../../lib/logger.js';
import type { AdvisoryLanguage } from '../ai/types.js';
import type { SessionContext } from './scenarios/session-context.types.js';

export type ConversationOwner = 'ai' | 'telecaller' | 'agronomist';
export type ConversationState =
  | 'language_select'
  | 'main_menu'
  | 'onboarding_minimal'
  | 'diagnosis'
  | 'diagnosis_awaiting_photos'
  | 'diagnosis_water_volume'
  | 'root_photos_requested'
  | 'nutrient_soil_confirm'
  | 'soil_flow'
  | 'terminology_clarify'
  | 'chimb_followup'
  | 'plot_select'
  | 'crop_select'
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
  context: SessionContext;
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
        'id, farmer_id, channel, state, preferred_language, conversation_owner, ai_paused, last_menu_at, last_ai_at, active_plot_id, active_block_id, context'
      )
      .single();

    if (error) throw error;
    const row = data as unknown as ConversationSession;
    row.context = (row.context ?? {}) as SessionContext;
    return row;
  },

  async getContext(farmerId: string): Promise<SessionContext> {
    const { data } = await supabase
      .from('conversation_sessions')
      .select('context')
      .eq('farmer_id', farmerId)
      .eq('channel', 'whatsapp')
      .maybeSingle();
    return (data?.context ?? {}) as SessionContext;
  },

  async patchContext(farmerId: string, patch: Partial<SessionContext>): Promise<SessionContext> {
    const current = await this.getContext(farmerId);
    const next = { ...current, ...patch };
    const now = new Date().toISOString();
    await supabase
      .from('conversation_sessions')
      .update({ context: next, updated_at: now })
      .eq('farmer_id', farmerId)
      .eq('channel', 'whatsapp');
    return next;
  },

  async setLanguage(farmerId: string, language: AdvisoryLanguage): Promise<void> {
    const now = new Date().toISOString();
    await supabase
      .from('conversation_sessions')
      .update({ preferred_language: language, state: 'main_menu', updated_at: now })
      .eq('farmer_id', farmerId)
      .eq('channel', 'whatsapp');

    await supabase
      .from('farmers')
      .update({ preferred_language: language, updated_at: now })
      .eq('id', farmerId);
  },

  /** Language chosen — continue mandatory onboarding (acre → plot → planting date). */
  async setLanguageForOnboarding(farmerId: string, language: AdvisoryLanguage): Promise<void> {
    const now = new Date().toISOString();
    await supabase
      .from('conversation_sessions')
      .update({
        preferred_language: language,
        state: 'onboarding_minimal',
        updated_at: now,
      })
      .eq('farmer_id', farmerId)
      .eq('channel', 'whatsapp');

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

  async clearActivePlot(farmerId: string): Promise<void> {
    const now = new Date().toISOString();
    await supabase
      .from('conversation_sessions')
      .update({ active_plot_id: null, active_block_id: null, updated_at: now })
      .eq('farmer_id', farmerId)
      .eq('channel', 'whatsapp');
    const ctx = await this.getContext(farmerId);
    const { activeCropType: _a, activePlotLabel: _b, ...rest } = ctx;
    await this.patchContext(farmerId, rest);
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

