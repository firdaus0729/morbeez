import { env } from '../../../config/env.js';
import { supabase } from '../../../lib/supabase.js';
import { eventBus } from '../../../events/bus.js';
import { createTelecallerTask } from '../pipeline/telecaller-tasks.service.js';
import { conversationSessionService } from '../conversation-session.service.js';
import { multiPlotService } from '../scenarios/multi-plot.service.js';
import { fetchCompactFarmerContext } from '../pipeline/advisory-context.service.js';
import { whatsappService } from '../whatsapp.service.js';
import { callbackFlowService } from '../scenarios/callback-flow.service.js';
import type { AdvisoryLanguage } from '../../ai/types.js';
import {
  applicationPrompt,
  appliedThanks,
  notYetReminder,
  outcomeBetter,
  outcomeNoImprovement,
  outcomePartial,
  resultValidationPrompt,
  sprayLogged,
} from './cultivation-logging-copy.js';

const applicationDays = () => env.CULTIVATION_APPLICATION_DAYS ?? 5;
const resultValidationDays = () => env.CULTIVATION_RESULT_DAYS ?? 10;

export type CultivationOutcome = 'better' | 'partial' | 'no_improvement';

export const cultivationLoggingService = {
  async logActivity(params: {
    farmerId: string;
    activityType?: 'spray_applied' | 'fertigation' | 'drench' | 'scouting' | 'other';
    appliedAt?: string;
    cropType?: string;
    cropStage?: string;
    dosageNotes?: string;
    products?: unknown[];
    notes?: string;
    advisorySessionId?: string;
    commerceOrderId?: string;
    farmerCropId?: string;
    source?: string;
  }): Promise<{ id: string }> {
    const activePlotId = await multiPlotService.getActivePlotId(params.farmerId);
    let farmerCropId = params.farmerCropId;
    if (!farmerCropId && activePlotId) {
      farmerCropId = activePlotId;
    }

    let cropType = params.cropType;
    let cropStage = params.cropStage;
    if (!cropType) {
      const ctx = await fetchCompactFarmerContext(params.farmerId, {
        activePlotId: farmerCropId ?? activePlotId,
      });
      cropType = ctx.cropType;
      cropStage = ctx.cropStage;
    }

    const { data, error } = await supabase
      .from('cultivation_activities')
      .insert({
        farmer_id: params.farmerId,
        farmer_crop_id: farmerCropId ?? null,
        advisory_session_id: params.advisorySessionId ?? null,
        commerce_order_id: params.commerceOrderId ?? null,
        activity_type: params.activityType ?? 'spray_applied',
        applied_at: params.appliedAt ?? new Date().toISOString().slice(0, 10),
        crop_type: cropType,
        crop_stage: cropStage ?? null,
        dosage_notes: params.dosageNotes ?? null,
        products: params.products ?? [],
        notes: params.notes ?? null,
        source: params.source ?? 'whatsapp',
      })
      .select('id')
      .single();

    if (error) throw error;
    return { id: data.id };
  },

  async scheduleApplicationPrompt(params: {
    farmerId: string;
    daysFromNow?: number;
    advisorySessionId?: string;
    commerceOrderId?: string;
    language?: AdvisoryLanguage;
  }): Promise<void> {
    if (!env.ENABLE_CULTIVATION_FOLLOW_UPS) return;

    const scheduledAt = new Date(
      Date.now() + (params.daysFromNow ?? applicationDays()) * 24 * 60 * 60 * 1000
    ).toISOString();

    await supabase.from('advisory_automation_jobs').insert({
      farmer_id: params.farmerId,
      session_id: params.advisorySessionId ?? null,
      job_type: 'cultivation_application_prompt',
      scheduled_at: scheduledAt,
      payload: {
        language: params.language ?? 'en',
        commerceOrderId: params.commerceOrderId,
        advisorySessionId: params.advisorySessionId,
      },
    });
  },

  async scheduleResultValidation(params: {
    farmerId: string;
    activityId: string;
    daysFromNow?: number;
    language?: AdvisoryLanguage;
  }): Promise<void> {
    if (!env.ENABLE_CULTIVATION_FOLLOW_UPS) return;

    const scheduledAt = new Date(
      Date.now() + (params.daysFromNow ?? resultValidationDays()) * 24 * 60 * 60 * 1000
    ).toISOString();

    await supabase.from('advisory_automation_jobs').insert({
      farmer_id: params.farmerId,
      job_type: 'cultivation_result_validation',
      scheduled_at: scheduledAt,
      payload: {
        language: params.language ?? 'en',
        activityId: params.activityId,
      },
    });
  },

  async sendApplicationPrompt(phone: string, farmerId: string, lang: AdvisoryLanguage): Promise<void> {
    const body = applicationPrompt(lang);
    try {
      await whatsappService.sendButtons({
        to: phone,
        body,
        buttons: [
          { id: 'cult.applied', title: 'Applied' },
          { id: 'cult.not_yet', title: 'Not Yet' },
          { id: 'cult.help', title: 'Need Help' },
        ],
      });
    } catch {
      await whatsappService.sendText(
        phone,
        `${body}\n\nReply: Applied / Not Yet / Need Help`
      );
    }
    await conversationSessionService.setState(farmerId, 'main_menu');
    await conversationSessionService.patchContext(farmerId, {
      pendingCultivationPrompt: 'application',
    });
  },

  async sendResultValidationPrompt(
    phone: string,
    farmerId: string,
    lang: AdvisoryLanguage,
    activityId: string
  ): Promise<void> {
    const body = resultValidationPrompt(lang);
    try {
      await whatsappService.sendButtons({
        to: phone,
        body,
        buttons: [
          { id: 'cult.better', title: 'Better' },
          { id: 'cult.partial', title: 'Partial' },
          { id: 'cult.no_improve', title: 'No Improve' },
        ],
      });
    } catch {
      await whatsappService.sendList({
        to: phone,
        body,
        buttonText: lang === 'ml' ? 'തിരഞ്ഞെടുക്കുക' : 'Choose',
        sections: [
          {
            title: 'Result',
            rows: [
              { id: 'cult.better', title: 'Better' },
              { id: 'cult.partial', title: 'Partial Improvement' },
              { id: 'cult.no_improve', title: 'No Improvement' },
              { id: 'cult.agronomist', title: 'Need Agronomist' },
            ],
          },
        ],
      });
    }
    await conversationSessionService.patchContext(farmerId, {
      pendingCultivationPrompt: 'result',
      pendingResultActivityId: activityId,
    });
  },

  async handleApplied(farmerId: string, _phone: string, lang: AdvisoryLanguage): Promise<string> {
    const ctx = await conversationSessionService.getContext(farmerId);

    const { id: activityId } = await this.logActivity({
      farmerId,
      activityType: 'spray_applied',
      advisorySessionId: ctx.lastAdvisorySessionId,
      notes: 'Farmer confirmed application via WhatsApp',
      source: 'whatsapp',
    });

    await this.scheduleResultValidation({
      farmerId,
      activityId,
      language: lang,
    });

    await conversationSessionService.patchContext(farmerId, {
      pendingCultivationPrompt: undefined,
    });

    return appliedThanks(lang);
  },

  async handleNotYet(farmerId: string, lang: AdvisoryLanguage): Promise<string> {
    await conversationSessionService.patchContext(farmerId, {
      pendingCultivationPrompt: undefined,
    });
    return notYetReminder(lang);
  },

  async handleOutcome(
    farmerId: string,
    phone: string,
    lang: AdvisoryLanguage,
    outcome: CultivationOutcome | 'agronomist'
  ): Promise<string> {
    const ctx = await conversationSessionService.getContext(farmerId);
    const activityId = ctx.pendingResultActivityId;

    const resolvedOutcome: CultivationOutcome =
      outcome === 'agronomist' ? 'no_improvement' : outcome;

    if (activityId) {
      await supabase
        .from('cultivation_activities')
        .update({
          outcome: resolvedOutcome,
          outcome_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        })
        .eq('id', activityId);
    }

    await conversationSessionService.patchContext(farmerId, {
      pendingCultivationPrompt: undefined,
      pendingResultActivityId: undefined,
    });

    if (resolvedOutcome === 'better') {
      return outcomeBetter(lang);
    }

    if (resolvedOutcome === 'partial') {
      return outcomePartial(lang);
    }

    await this.escalateNoImprovement(farmerId, phone, lang, activityId);
    return outcomeNoImprovement(lang);
  },

  async escalateNoImprovement(
    farmerId: string,
    phone: string,
    _lang: AdvisoryLanguage,
    activityId?: string
  ): Promise<void> {
    const ctx = await conversationSessionService.getContext(farmerId);
    const sessionId = ctx.lastAdvisorySessionId;

    if (sessionId) {
      await supabase.from('agronomist_escalations').insert({
        session_id: sessionId,
        farmer_id: farmerId,
        reason: 'No improvement reported after spray application (WhatsApp)',
        confidence_at_escalation: 0.5,
        priority: 'high',
        status: 'pending',
      });

      await eventBus.publish(
        'advisory.escalated',
        {
          sessionId,
          farmerId,
          reason: 'cultivation_no_improvement',
          priority: 'high',
        },
        'cultivation-logging'
      );
    }

    await createTelecallerTask({
      farmerId,
      title: 'Cultivation — no improvement after application',
      notes: `Activity ${activityId ?? 'n/a'} | Farmer phone ${phone}`,
      priority: 'high',
    });
  },

  async handleSprayCompletedText(
    farmerId: string,
    _phone: string,
    lang: AdvisoryLanguage,
    text?: string
  ): Promise<string> {
    const ctx = await conversationSessionService.getContext(farmerId);
    const cropCtx = await fetchCompactFarmerContext(farmerId, {
      activePlotId: await multiPlotService.getActivePlotId(farmerId),
    });

    const { id: activityId } = await this.logActivity({
      farmerId,
      activityType: 'spray_applied',
      advisorySessionId: ctx.lastAdvisorySessionId,
      notes: text?.slice(0, 300) ?? 'Spray completed (WhatsApp)',
      cropType: cropCtx.cropType,
      cropStage: cropCtx.cropStage,
      source: 'whatsapp',
    });

    await this.scheduleResultValidation({
      farmerId,
      activityId,
      language: lang,
    });

    return sprayLogged(lang, cropCtx.cropType);
  },

  isSprayCompletedMessage(text: string): boolean {
    const t = text.trim().toLowerCase();
    return (
      /\b(spray|sprey|തളി|தெளி|ಸ್ಪ್ರೇ|स्प्रे).*(done|complete|finished|ചെയ്ത|முடிஞ|ಮುಗಿ|हो गया|കഴിഞ്ഞ)/i.test(
        t
      ) ||
      /^spray\s*(done|completed|complete)$/i.test(t) ||
      /സ്പ്രേ\s*(ചെയ്ത|കഴിഞ്ഞ)/i.test(t)
    );
  },

  async handleInboundAction(params: {
    farmerId: string;
    phone: string;
    language: AdvisoryLanguage;
    action: string;
    text?: string;
  }): Promise<{ handled: boolean; reply?: string }> {
    const { farmerId, phone, language: lang, action, text } = params;

    if (action === 'cult.applied' || /^applied$/i.test(action)) {
      const reply = await this.handleApplied(farmerId, phone, lang);
      await whatsappService.sendText(phone, reply);
      return { handled: true };
    }

    if (action === 'cult.not_yet' || /not yet/i.test(action)) {
      const reply = await this.handleNotYet(farmerId, lang);
      await whatsappService.sendText(phone, reply);
      return { handled: true };
    }

    if (action === 'cult.help' || action === 'cult.need_help') {
      const reply = await callbackFlowService.createCallback(
        farmerId,
        lang,
        'Help applying recommendation'
      );
      await whatsappService.sendText(phone, reply);
      return { handled: true };
    }

    if (action === 'cult.better' || /^better$/i.test(action)) {
      const reply = await this.handleOutcome(farmerId, phone, lang, 'better');
      await whatsappService.sendText(phone, reply);
      return { handled: true };
    }

    if (action === 'cult.partial' || /partial/i.test(action)) {
      const reply = await this.handleOutcome(farmerId, phone, lang, 'partial');
      await whatsappService.sendText(phone, reply);
      return { handled: true };
    }

    if (
      action === 'cult.no_improve' ||
      action === 'cult.agronomist' ||
      /no improvement/i.test(action)
    ) {
      const reply = await this.handleOutcome(
        farmerId,
        phone,
        lang,
        action === 'cult.agronomist' ? 'agronomist' : 'no_improvement'
      );
      await whatsappService.sendText(phone, reply);
      return { handled: true };
    }

    if (text && this.isSprayCompletedMessage(text)) {
      const reply = await this.handleSprayCompletedText(farmerId, phone, lang, text);
      await whatsappService.sendText(phone, reply);
      return { handled: true };
    }

    return { handled: false };
  },

  async onAdvisoryCompleted(params: {
    farmerId: string;
    sessionId: string;
    language: AdvisoryLanguage;
    hasProductRecommendations: boolean;
  }): Promise<void> {
    await conversationSessionService.patchContext(params.farmerId, {
      lastAdvisorySessionId: params.sessionId,
    });

    if (params.hasProductRecommendations) {
      await this.scheduleApplicationPrompt({
        farmerId: params.farmerId,
        advisorySessionId: params.sessionId,
        language: params.language,
        daysFromNow: applicationDays(),
      });
    }
  },

  async onOrderDispatched(params: {
    farmerId: string;
    commerceOrderId?: string;
    language: AdvisoryLanguage;
  }): Promise<void> {
    if (!params.farmerId) return;
    await this.scheduleApplicationPrompt({
      farmerId: params.farmerId,
      commerceOrderId: params.commerceOrderId,
      language: params.language,
      daysFromNow: applicationDays(),
    });
  },
};
