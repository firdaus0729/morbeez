import { env } from '../../../config/env.js';
import { supabase } from '../../../lib/supabase.js';
import { hashPassword, verifyPassword } from '../../../lib/password.js';
import type { AdvisoryLanguage } from '../../ai/types.js';
import { conversationSessionService } from '../conversation-session.service.js';
import { ledgerSummaryService } from './ledger-summary.service.js';
import { sendReplyButtonMenu } from '../whatsapp-interactive-menu.service.js';
import type { ScenarioSenders } from '../scenarios/whatsapp-scenario-router.service.js';
import { logger } from '../../../lib/logger.js';
import { createRoiWhatsAppSenders } from './roi-whatsapp-senders.js';
import type { ConversationState } from '../conversation-session.service.js';

export type RoiEntryType = 'labour' | 'purchase' | 'misc' | 'harvest' | 'income';

const ROI_BUTTON_IDS = new Set([
  'roi.labour',
  'roi.purchase',
  'roi.misc',
  'roi.harvest',
  'roi.finish',
]);

function todayIstDate(): string {
  return new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Kolkata' }).format(new Date());
}

function istHour(): number {
  return Number(
    new Intl.DateTimeFormat('en-IN', {
      timeZone: 'Asia/Kolkata',
      hour: 'numeric',
      hour12: false,
    }).format(new Date())
  );
}

function parseAmount(text: string): number | null {
  const m = text.replace(/,/g, '').match(/(\d+(?:\.\d{1,2})?)/);
  if (!m) return null;
  const n = Number(m[1]);
  if (!Number.isFinite(n) || n <= 0 || n > 50_000_000) return null;
  return Math.round(n * 100) / 100;
}

function entryPrompt(type: RoiEntryType, language: AdvisoryLanguage): string {
  const map: Record<RoiEntryType, Record<AdvisoryLanguage, string>> = {
    labour: {
      en: 'Labour — enter amount in ₹ (example: 800)',
      ml: 'തൊഴിൽ — തുക ₹ ൽ ടൈപ്പ് ചെയ്യുക (ഉദാ: 800)',
      ta: 'தொழில் — தொகை ₹ (எ.கா: 800)',
      kn: 'ಶ್ರಮ — ಮೊತ್ತ ₹ (ಉದಾ: 800)',
      hi: 'मजदूरी — राशि ₹ में (जैसे: 800)',
    },
    purchase: {
      en: 'Purchase — enter amount in ₹',
      ml: 'വാങ്ങൽ — തുക ₹',
      ta: 'வாங்கல் — தொகை ₹',
      kn: 'ಖರೀದಿ — ಮೊತ್ತ ₹',
      hi: 'खरीद — राशि ₹',
    },
    misc: {
      en: 'Misc expense — enter amount in ₹',
      ml: 'മറ്റ് ചെലവ് — തുക ₹',
      ta: 'மற்ற செலவு — தொகை ₹',
      kn: 'ಇತರೆ ಖರ್ಚು — ಮೊತ್ತ ₹',
      hi: 'अन्य खर्च — राशि ₹',
    },
    harvest: {
      en: 'Harvest income — enter amount in ₹',
      ml: 'വിളവ് വരുമാനം — തുക ₹',
      ta: 'விளைச்சல் வருமானம் — தொகை ₹',
      kn: 'ಸುಗ್ಗಿ ಆದಾಯ — ಮೊತ್ತ ₹',
      hi: 'फसल आय — राशि ₹',
    },
    income: {
      en: 'Other income — enter amount in ₹',
      ml: 'മറ്റ് വരുമാനം — തുക ₹',
      ta: 'மற்ற வருமானம் — தொகை ₹',
      kn: 'ಇತರೆ ಆದಾಯ — ಮೊತ್ತ ₹',
      hi: 'अन्य आय — राशि ₹',
    },
  };
  return map[type][language] ?? map[type].en;
}

export const roiFlowService = {
  isRoiButton(id: string): boolean {
    return ROI_BUTTON_IDS.has(id) || id.startsWith('roi.');
  },

  async ensureSettings(farmerId: string): Promise<void> {
    await supabase.from('farmer_roi_settings').upsert(
      { farmer_id: farmerId, updated_at: new Date().toISOString() },
      { onConflict: 'farmer_id' }
    );
  },

  async alreadyPromptedToday(farmerId: string): Promise<boolean> {
    const today = todayIstDate();
    const { data: settings } = await supabase
      .from('farmer_roi_settings')
      .select('last_daily_prompt_at')
      .eq('farmer_id', farmerId)
      .maybeSingle();
    if (!settings?.last_daily_prompt_at) return false;
    const last = new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Kolkata' }).format(
      new Date(settings.last_daily_prompt_at)
    );
    return last === today;
  },

  async maybeSendDailyPrompt(params: {
    farmerId: string;
    phone: string;
    language: AdvisoryLanguage;
    send: ScenarioSenders;
    force?: boolean;
  }): Promise<boolean> {
    if (env.ENABLE_WHATSAPP_ROI === false || env.ENABLE_ROI_DAILY_PROMPT === false) {
      return false;
    }
    if (!params.force && istHour() < 18) return false;

    const { data: session } = await supabase
      .from('conversation_sessions')
      .select('ai_paused, conversation_owner, state')
      .eq('farmer_id', params.farmerId)
      .eq('channel', 'whatsapp')
      .maybeSingle();

    if (session?.ai_paused) return false;
    if (session?.conversation_owner && session.conversation_owner !== 'ai') return false;

    const { data: settings } = await supabase
      .from('farmer_roi_settings')
      .select('opted_in, last_daily_prompt_at')
      .eq('farmer_id', params.farmerId)
      .maybeSingle();

    if (!settings?.opted_in) return false;
    if (!params.force && (await this.alreadyPromptedToday(params.farmerId))) return false;

    await this.sendEntryMenu(params.phone, params.language, params.send, {
      intro:
        params.language === 'ml'
          ? 'ഇന്നത്തെ ഫാം എൻട്രി — ഒരു ഓപ്ഷൻ തിരഞ്ഞെടുക്കുക:'
          : "Today's farm entry — choose an option:",
    });

    await supabase
      .from('farmer_roi_settings')
      .update({ last_daily_prompt_at: new Date().toISOString() })
      .eq('farmer_id', params.farmerId);

    await conversationSessionService.setState(params.farmerId, 'roi_entry');

    await supabase.from('interaction_logs').insert({
      farmer_id: params.farmerId,
      channel: 'whatsapp',
      direction: 'outbound',
      content: 'ROI daily prompt (6 PM)',
    });

    return true;
  },

  /**
   * Send 6 PM ROI prompts to all opted-in farmers (worker batch).
   */
  async runDailyPromptsBatch(options?: {
    farmerId?: string;
    dryRun?: boolean;
    limit?: number;
  }): Promise<{ sent: number; skipped: number; failed: number }> {
    if (env.ENABLE_WHATSAPP_ROI === false || env.ENABLE_ROI_DAILY_PROMPT === false) {
      return { sent: 0, skipped: 0, failed: 0 };
    }

    let q = supabase.from('farmer_roi_settings').select('farmer_id').eq('opted_in', true);

    if (options?.farmerId) q = q.eq('farmer_id', options.farmerId);

    const { data: rows, error } = await q.limit(options?.limit ?? 500);
    if (error) {
      logger.error({ err: error }, 'ROI daily prompt batch query failed');
      return { sent: 0, skipped: 0, failed: 0 };
    }

    const send = createRoiWhatsAppSenders();
    let sent = 0;
    let skipped = 0;
    let failed = 0;

    for (const row of rows ?? []) {
      const farmerId = String(row.farmer_id);
      const { data: farmer } = await supabase
        .from('farmers')
        .select('phone, preferred_language')
        .eq('id', farmerId)
        .maybeSingle();

      if (!farmer?.phone) {
        skipped += 1;
        continue;
      }

      const language = (farmer.preferred_language ?? 'en') as AdvisoryLanguage;

      if (options?.dryRun) {
        skipped += 1;
        continue;
      }

      try {
        const ok = await this.maybeSendDailyPrompt({
          farmerId,
          phone: farmer.phone,
          language,
          send,
          force: true,
        });
        if (ok) sent += 1;
        else skipped += 1;
        await new Promise((r) => setTimeout(r, 400));
      } catch (err) {
        failed += 1;
        logger.warn({ err, farmerId }, 'ROI daily prompt send failed');
      }
    }

    return { sent, skipped, failed };
  },

  /**
   * If farmer messages after 6 PM IST and has not had today's prompt, nudge once (no duplicate with menu).
   */
  async tryEveningPromptOnInbound(params: {
    farmerId: string;
    phone: string;
    language: AdvisoryLanguage;
    sessionState: ConversationState;
    routeHandled: boolean;
    text?: string;
    send: ScenarioSenders;
  }): Promise<boolean> {
    if (env.ENABLE_WHATSAPP_ROI === false || env.ENABLE_ROI_DAILY_PROMPT === false) return false;
    if (istHour() < 18) return false;
    if (params.sessionState !== 'main_menu') return false;
    if (params.routeHandled) return false;
    if (params.text?.startsWith('roi.')) return false;

    return this.maybeSendDailyPrompt({
      farmerId: params.farmerId,
      phone: params.phone,
      language: params.language,
      send: params.send,
    });
  },

  async sendEntryMenu(
    phone: string,
    language: AdvisoryLanguage,
    send: ScenarioSenders,
    options?: { intro?: string }
  ): Promise<void> {
    const intro =
      options?.intro ??
      (language === 'ml'
        ? 'ROI ട്രാക്കർ — ഇന്നത്തെ എൻട്രി:'
        : 'ROI Tracker — add today\'s entry:');

    const rows = [
      { id: 'roi.labour', title: 'Labour', description: 'Wages / labour cost' },
      { id: 'roi.purchase', title: 'Purchase', description: 'Inputs / materials' },
      { id: 'roi.misc', title: 'Misc', description: 'Other expense' },
      { id: 'roi.harvest', title: 'Harvest', description: 'Harvest income' },
      { id: 'roi.finish', title: 'Finish', description: 'Save & show balance' },
    ];

    if (send.buttons) {
      await sendReplyButtonMenu({
        to: phone,
        body: intro,
        options: rows.map((r) => ({ id: r.id, title: r.title })),
        continuationBody: language === 'ml' ? 'കൂടുതൽ എൻട്രി:' : 'More entry types:',
        sendButtons: (p) =>
          send.buttons!({
            phone: p.to,
            body: p.body,
            buttons: p.buttons,
          }),
      });
    } else if (send.list) {
      await send.list({
        phone,
        body: intro,
        buttonText: language === 'ml' ? 'തിരഞ്ഞെടുക്കുക' : 'Choose',
        sections: [{ title: 'ROI', rows }],
      });
    } else {
      await send.text(phone, intro);
    }
  },

  async startTracker(params: {
    farmerId: string;
    phone: string;
    language: AdvisoryLanguage;
    send: ScenarioSenders;
  }): Promise<void> {
    if (env.ENABLE_WHATSAPP_ROI === false) {
      await params.send.text(
        params.phone,
        params.language === 'ml'
          ? 'ROI ട്രാക്കർ ഇപ്പോൾ ലഭ്യമല്ല.'
          : 'ROI Tracker is not available right now.'
      );
      return;
    }

    await this.ensureSettings(params.farmerId);
    await supabase
      .from('farmer_roi_settings')
      .update({ opted_in: true, updated_at: new Date().toISOString() })
      .eq('farmer_id', params.farmerId);

    const { data: settings } = await supabase
      .from('farmer_roi_settings')
      .select('pin_hash')
      .eq('farmer_id', params.farmerId)
      .maybeSingle();

    if (!settings?.pin_hash) {
      await conversationSessionService.patchContext(params.farmerId, {
        roiAwaitingPinSetup: true,
      });
      await conversationSessionService.setState(params.farmerId, 'roi_set_pin');
      await params.send.text(
        params.phone,
        params.language === 'ml'
          ? 'സുരക്ഷയ്ക്ക് 4 അക്ക PIN സജ്ജമാക്കുക (എഡിറ്റ് ചെയ്യാൻ ഉപയോഗിക്കും).'
          : 'Set a 4-digit PIN for security (needed to edit entries).'
      );
      return;
    }

    await this.sendEntryMenu(params.phone, params.language, params.send);
    await conversationSessionService.setState(params.farmerId, 'roi_entry');
  },

  async handleButton(
    farmerId: string,
    phone: string,
    language: AdvisoryLanguage,
    buttonId: string,
    send: ScenarioSenders
  ): Promise<boolean> {
    if (buttonId === 'roi.finish') {
      const totals = await ledgerSummaryService.balanceForFarmer(farmerId);
      const msg =
        language === 'ml'
          ? `ഇന്നത്തെ ബാലൻസ്: ₹${totals.balance.toFixed(0)}\n(വരുമാനം ₹${totals.credits.toFixed(0)} − ചെലവ് ₹${totals.debits.toFixed(0)})`
          : `Balance so far: ₹${totals.balance.toFixed(0)}\n(Income ₹${totals.credits.toFixed(0)} − Expense ₹${totals.debits.toFixed(0)})`;
      await send.text(phone, msg);
      await conversationSessionService.setState(farmerId, 'main_menu');
      return true;
    }

    const type = buttonId.replace('roi.', '') as RoiEntryType;
    if (!['labour', 'purchase', 'misc', 'harvest'].includes(type)) return false;

    await conversationSessionService.patchContext(farmerId, {
      roiPendingEntryType: type,
    });
    await send.text(phone, entryPrompt(type, language));
    return true;
  },

  async recordEntry(params: {
    farmerId: string;
    entryType: RoiEntryType;
    amount: number;
    note?: string;
  }): Promise<string> {
    const { data, error } = await supabase
      .from('farmer_roi_entries')
      .insert({
        farmer_id: params.farmerId,
        entry_type: params.entryType,
        amount_inr: params.amount,
        note: params.note?.slice(0, 200) ?? null,
        entry_date: todayIstDate(),
      })
      .select('id')
      .single();

    if (error || !data) throw error ?? new Error('Could not save ROI entry');

    await supabase.from('farmer_roi_audit_log').insert({
      farmer_id: params.farmerId,
      entry_id: data.id,
      action: 'create',
      new_amount_inr: params.amount,
      reason: `WhatsApp ${params.entryType} entry`,
      actor: 'farmer',
    });

    return data.id as string;
  },

  async tryHandleInbound(params: {
    farmerId: string;
    phone: string;
    language: AdvisoryLanguage;
    text: string;
    send: ScenarioSenders;
    sessionState: string;
  }): Promise<boolean> {
    if (env.ENABLE_WHATSAPP_ROI === false) return false;

    const text = params.text.trim();
    if (!text) return false;

    if (params.text.startsWith('roi.') && ROI_BUTTON_IDS.has(params.text)) {
      return this.handleButton(params.farmerId, params.phone, params.language, params.text, params.send);
    }

    const ctx = await conversationSessionService.getContext(params.farmerId);

    if (params.sessionState === 'roi_set_pin' || ctx.roiAwaitingPinSetup) {
      if (!/^\d{4}$/.test(text)) {
        await params.send.text(
          params.phone,
          params.language === 'ml' ? '4 അക്ക PIN മാത്രം.' : 'Please send a 4-digit PIN only.'
        );
        return true;
      }
      await supabase
        .from('farmer_roi_settings')
        .upsert({
          farmer_id: params.farmerId,
          opted_in: true,
          pin_hash: hashPassword(text),
          updated_at: new Date().toISOString(),
        });
      await conversationSessionService.patchContext(params.farmerId, { roiAwaitingPinSetup: false });
      await this.sendEntryMenu(params.phone, params.language, params.send);
      await conversationSessionService.setState(params.farmerId, 'roi_entry');
      return true;
    }

    if (params.sessionState === 'roi_edit_pin' && ctx.roiPendingEditEntryId) {
      const { data: settings } = await supabase
        .from('farmer_roi_settings')
        .select('pin_hash')
        .eq('farmer_id', params.farmerId)
        .maybeSingle();
      if (!settings?.pin_hash || !verifyPassword(text, settings.pin_hash)) {
        await params.send.text(
          params.phone,
          params.language === 'ml' ? 'PIN തെറ്റാണ്.' : 'Incorrect PIN.'
        );
        return true;
      }
      await conversationSessionService.patchContext(params.farmerId, {
        roiEditUnlocked: true,
      });
      await conversationSessionService.setState(params.farmerId, 'roi_edit_amount');
      await params.send.text(
        params.phone,
        params.language === 'ml'
          ? 'പുതിയ തുക ₹ ൽ അയയ്ക്കുക. കാരണം: "തൊഴിൽ കുറഞ്ഞു" പോലെ ഒരൊറ്റ വരിയിൽ.'
          : 'Send new amount in ₹. Optional: "800 reason: corrected labour"'
      );
      return true;
    }

    if (params.sessionState === 'roi_edit_amount' && ctx.roiPendingEditEntryId && ctx.roiEditUnlocked) {
      const amount = parseAmount(text);
      if (amount == null) {
        await params.send.text(params.phone, params.language === 'ml' ? 'സാധുവായ തുക അയയ്ക്കുക.' : 'Send a valid amount.');
        return true;
      }
      const reasonMatch = text.match(/reason[:\s]+(.+)/i);
      const reason = reasonMatch?.[1]?.trim() || 'Farmer correction via WhatsApp';

      const { data: old } = await supabase
        .from('farmer_roi_entries')
        .select('amount_inr')
        .eq('id', ctx.roiPendingEditEntryId)
        .eq('farmer_id', params.farmerId)
        .maybeSingle();

      await supabase
        .from('farmer_roi_entries')
        .update({ amount_inr: amount, updated_at: new Date().toISOString() })
        .eq('id', ctx.roiPendingEditEntryId)
        .eq('farmer_id', params.farmerId);

      await supabase.from('farmer_roi_audit_log').insert({
        farmer_id: params.farmerId,
        entry_id: ctx.roiPendingEditEntryId,
        action: 'update',
        old_amount_inr: old?.amount_inr ?? null,
        new_amount_inr: amount,
        reason: reason.slice(0, 300),
        actor: 'farmer',
      });

      await conversationSessionService.patchContext(params.farmerId, {
        roiPendingEditEntryId: undefined,
        roiEditUnlocked: false,
      });
      await conversationSessionService.setState(params.farmerId, 'roi_entry');
      await params.send.text(
        params.phone,
        params.language === 'ml' ? `എൻട്രി അപ്ഡേറ്റ് ചെയ്തു: ₹${amount}` : `Entry updated: ₹${amount}`
      );
      return true;
    }

    if (params.sessionState === 'roi_entry' && ctx.roiPendingEntryType) {
      const amount = parseAmount(text);
      if (amount == null) {
        await params.send.text(params.phone, entryPrompt(ctx.roiPendingEntryType as RoiEntryType, params.language));
        return true;
      }
      const entryType = ctx.roiPendingEntryType as RoiEntryType;
      await this.recordEntry({
        farmerId: params.farmerId,
        entryType,
        amount,
        note: text.replace(/[\d.,₹]/g, '').trim() || undefined,
      });
      await conversationSessionService.patchContext(params.farmerId, { roiPendingEntryType: undefined });
      const ack =
        params.language === 'ml'
          ? `രേഖപ്പെടുത്തി ✅ ₹${amount} (${entryType})\n\nമറ്റൊരു എൻട്രി ചേർക്കാൻ ബട്ടൺ ഉപയോഗിക്കുക അല്ലെങ്കിൽ Finish.`
          : `Saved ✅ ₹${amount} (${entryType})\n\nAdd another entry or tap Finish.`;
      await this.sendEntryMenu(params.phone, params.language, params.send, { intro: ack });
      return true;
    }

    if (/^edit\s+last$/i.test(text) && params.sessionState === 'roi_entry') {
      const { data: last } = await supabase
        .from('farmer_roi_entries')
        .select('id, entry_type, amount_inr')
        .eq('farmer_id', params.farmerId)
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle();
      if (!last) {
        await params.send.text(params.phone, params.language === 'ml' ? 'എൻട്രികൾ ഇല്ല.' : 'No entries yet.');
        return true;
      }
      await conversationSessionService.patchContext(params.farmerId, {
        roiPendingEditEntryId: last.id,
        roiEditUnlocked: false,
      });
      await conversationSessionService.setState(params.farmerId, 'roi_edit_pin');
      await params.send.text(
        params.phone,
        params.language === 'ml'
          ? `അവസാന എൻട്രി: ${last.entry_type} ₹${last.amount_inr}\nഎഡിറ്റ് ചെയ്യാൻ PIN അയയ്ക്കുക.`
          : `Last entry: ${last.entry_type} ₹${last.amount_inr}\nSend PIN to edit.`
      );
      return true;
    }

    return false;
  },
};
