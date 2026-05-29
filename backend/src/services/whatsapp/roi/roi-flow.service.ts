import { env } from '../../../config/env.js';
import { supabase } from '../../../lib/supabase.js';
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

const CREDIT_TYPES = new Set<RoiEntryType>(['harvest', 'income']);

function debitCreditForType(type: RoiEntryType, amount: number) {
  if (CREDIT_TYPES.has(type)) return { debit_inr: null, credit_inr: amount };
  return { debit_inr: amount, credit_inr: null };
}

function parseEntryDate(text: string): string | null {
  const t = text.trim().toLowerCase();
  if (!t || t === 'today' || t === 'innu' || t === 'aaj') return todayIstDate();
  const dmy = t.match(/^(\d{1,2})[\/\-.](\d{1,2})[\/\-.](\d{2,4})$/);
  if (dmy) {
    const day = Number(dmy[1]);
    const month = Number(dmy[2]);
    let year = Number(dmy[3]);
    if (year < 100) year += 2000;
    if (month >= 1 && month <= 12 && day >= 1 && day <= 31) {
      return `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
    }
  }
  if (/^\d{4}-\d{2}-\d{2}$/.test(t)) return t;
  return null;
}

function datePrompt(language: AdvisoryLanguage): string {
  return language === 'ml'
    ? 'തീയതി അയയ്ക്കുക (ഉദാ: 29-05-2026) അല്ലെങ്കിൽ "today" ടൈപ്പ് ചെയ്യുക.'
    : 'Send entry date (e.g. 29-05-2026) or type "today".';
}

function commentsChoicePrompt(language: AdvisoryLanguage): string {
  return language === 'ml'
    ? 'കമന്റ് ചേർക്കണോ? Yes / No'
    : 'Do you want to add comments? Reply Yes or No.';
}

function commentsTextPrompt(language: AdvisoryLanguage): string {
  return language === 'ml' ? 'കമന്റ് ടൈപ്പ് ചെയ്യുക (ഒരു വരി):' : 'Type your comment (one line):';
}

function amountKindLabel(type: RoiEntryType, language: AdvisoryLanguage): string {
  const isCredit = CREDIT_TYPES.has(type);
  if (language === 'ml') return isCredit ? 'ക്രെഡിറ്റ് (വരുമാനം)' : 'ഡെബിറ്റ് (ചെലവ്)';
  return isCredit ? 'Credit (income)' : 'Debit (expense)';
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

    await supabase.from('farmers').update({ roi_enabled: true }).eq('id', params.farmerId);

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
      roiPendingEntryDate: undefined,
      roiPendingAmount: undefined,
      roiAwaitingCommentsChoice: false,
      roiAwaitingCommentsText: false,
    });
    await send.text(phone, datePrompt(language));
    return true;
  },

  async recordEntry(params: {
    farmerId: string;
    entryType: RoiEntryType;
    amount: number;
    entryDate: string;
    comments?: string;
  }): Promise<string> {
    const dc = debitCreditForType(params.entryType, params.amount);
    const snapshot = {
      entry_date: params.entryDate,
      entry_type: params.entryType,
      comments: params.comments ?? null,
      debit_inr: dc.debit_inr,
      credit_inr: dc.credit_inr,
      amount_inr: params.amount,
    };

    const { data, error } = await supabase
      .from('farmer_roi_entries')
      .insert({
        farmer_id: params.farmerId,
        entry_type: params.entryType,
        amount_inr: params.amount,
        debit_inr: dc.debit_inr,
        credit_inr: dc.credit_inr,
        comments: params.comments?.slice(0, 500) ?? null,
        note: params.comments?.slice(0, 200) ?? null,
        entry_date: params.entryDate,
      })
      .select('id')
      .single();

    if (error || !data) throw error ?? new Error('Could not save ROI entry');

    await supabase.from('farmer_roi_audit_log').insert({
      farmer_id: params.farmerId,
      entry_id: data.id,
      action: 'create',
      new_amount_inr: params.amount,
      new_snapshot: snapshot,
      reason: `WhatsApp ${params.entryType} entry`,
      actor: 'farmer',
    });

    return data.id as string;
  },

  async finalizePendingEntry(
    farmerId: string,
    phone: string,
    language: AdvisoryLanguage,
    send: ScenarioSenders,
    comments?: string
  ): Promise<void> {
    const ctx = await conversationSessionService.getContext(farmerId);
    const entryType = ctx.roiPendingEntryType as RoiEntryType | undefined;
    const amount = ctx.roiPendingAmount;
    const entryDate = ctx.roiPendingEntryDate ?? todayIstDate();
    if (!entryType || amount == null) return;

    await this.recordEntry({
      farmerId,
      entryType,
      amount,
      entryDate,
      comments,
    });

    await conversationSessionService.patchContext(farmerId, {
      roiPendingEntryType: undefined,
      roiPendingEntryDate: undefined,
      roiPendingAmount: undefined,
      roiAwaitingCommentsChoice: false,
      roiAwaitingCommentsText: false,
    });

    const kind = amountKindLabel(entryType, language);
    const ack =
      language === 'ml'
        ? `രേഖപ്പെടുത്തി ✅ ${entryDate} | ${entryType} | ${kind} ₹${amount}${comments ? `\nകമന്റ്: ${comments}` : ''}\n\nമറ്റൊരു എൻട്രി ചേർക്കുക അല്ലെങ്കിൽ Finish.`
        : `Saved ✅ ${entryDate} | ${entryType} | ${kind} ₹${amount}${comments ? `\nComment: ${comments}` : ''}\n\nAdd another entry or tap Finish.`;
    await this.sendEntryMenu(phone, language, send, { intro: ack });
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

    if (/^edit\s+last$/i.test(text)) {
      await params.send.text(
        params.phone,
        params.language === 'ml'
          ? 'എൻട്രി തിരുത്തൽ ടെലികോളർ CRM-ൽ മാത്രം. നിങ്ങളുടെ ഓഫീസുമായി ബന്ധപ്പെടുക.'
          : 'Entries can only be corrected by your telecaller in the office — not in this chat.'
      );
      return true;
    }

    if (params.sessionState === 'roi_entry' && ctx.roiPendingEntryType) {
      const entryType = ctx.roiPendingEntryType as RoiEntryType;

      if (!ctx.roiPendingEntryDate) {
        const entryDate = parseEntryDate(text);
        if (!entryDate) {
          await params.send.text(params.phone, datePrompt(params.language));
          return true;
        }
        await conversationSessionService.patchContext(params.farmerId, { roiPendingEntryDate: entryDate });
        const kind = amountKindLabel(entryType, params.language);
        await params.send.text(
          params.phone,
          params.language === 'ml'
            ? `${kind} — തുക ₹ ൽ അയയ്ക്കുക (ഉദാ: 800)`
            : `${kind} — enter amount in ₹ (example: 800)`
        );
        return true;
      }

      if (ctx.roiPendingAmount == null) {
        const amount = parseAmount(text);
        if (amount == null) {
          await params.send.text(params.phone, entryPrompt(entryType, params.language));
          return true;
        }
        await conversationSessionService.patchContext(params.farmerId, {
          roiPendingAmount: amount,
          roiAwaitingCommentsChoice: true,
        });
        await params.send.text(params.phone, commentsChoicePrompt(params.language));
        return true;
      }

      if (ctx.roiAwaitingCommentsChoice && !ctx.roiAwaitingCommentsText) {
        const yes = /^(yes|y|അതെ|ha|haan)$/i.test(text);
        const no = /^(no|n|skip|ഇല്ല|illa)$/i.test(text);
        if (!yes && !no) {
          await params.send.text(params.phone, commentsChoicePrompt(params.language));
          return true;
        }
        if (no) {
          await this.finalizePendingEntry(
            params.farmerId,
            params.phone,
            params.language,
            params.send
          );
          return true;
        }
        await conversationSessionService.patchContext(params.farmerId, {
          roiAwaitingCommentsChoice: false,
          roiAwaitingCommentsText: true,
        });
        await params.send.text(params.phone, commentsTextPrompt(params.language));
        return true;
      }

      if (ctx.roiAwaitingCommentsText) {
        const comment = text.slice(0, 500);
        await this.finalizePendingEntry(
          params.farmerId,
          params.phone,
          params.language,
          params.send,
          comment
        );
        return true;
      }
    }

    return false;
  },
};
