import { supabase } from '../../../lib/supabase.js';
import { logger } from '../../../lib/logger.js';
import type { AdvisoryLanguage } from '../../ai/types.js';
import type { InboundMessage } from '../pipeline/types.js';
import {
  conversationSessionService,
  type ConversationSession,
} from '../conversation-session.service.js';
import { mainMenuCopy, moreMenuCopy, normalizeMenuId } from './whatsapp-menu.service.js';
import { previousRecommendationsService } from './previous-recommendations.service.js';
import { roiFlowService } from '../roi/roi-flow.service.js';
import { ledgerSummaryService } from '../roi/ledger-summary.service.js';
import { t } from './whatsapp-flow-copy.js';
import { weatherAlertsService } from './weather-alerts.service.js';
import { dailyPricesService } from './daily-prices.service.js';
import { soilFlowService } from './soil-flow.service.js';
import {
  nutrientSoilGateService,
  suggestsNutrientDeficiency,
} from './nutrient-soil-gate.service.js';
import { callbackFlowService } from './callback-flow.service.js';
import { terminologyService } from './terminology.service.js';
import { diagnosisFlowService } from './diagnosis-flow.service.js';
import { farmerWelcomeService } from './farmer-welcome.service.js';
import { multiPlotService } from './multi-plot.service.js';
import { orderWhatsappService } from '../orders/order-whatsapp.service.js';
import { cultivationLoggingService } from '../cultivation/cultivation-logging.service.js';
import { sendReplyButtonMenu } from '../whatsapp-interactive-menu.service.js';
import { accuracyMetricsService } from '../../ai/accuracy-metrics.service.js';
import { createTelecallerTask } from '../pipeline/telecaller-tasks.service.js';
import { cropSelectionService } from './crop-selection.service.js';
import { farmerPurgeService } from '../../farmer/farmer-purge.service.js';
import { blockService } from '../../core/block.service.js';
import {
  invalidPincodeReply,
  onboardingFlowService,
  parsePincodeInput,
  pincodePrompt,
  pincodeSavedReply,
  plantingDatePrompt,
} from './onboarding-flow.service.js';
import { pincodeService } from '../../core/pincode.service.js';
import { recommendationFollowUpService } from '../../core/recommendation-follow-up.service.js';
import { returnUserGreetingService } from './return-user-greeting.service.js';
import { farmerFeedbackFlowService } from './farmer-feedback-flow.service.js';

const CROP_MEDIA = new Set(['image', 'image_message', 'document']);
const MENU_IDS = new Set([
  'menu.crop_assessment',
  'menu.diagnosis',
  'menu.track_order',
  'menu.weather',
  'menu.prices',
  'menu.soil',
  'menu.expert',
  'menu.more',
  'menu.prev_recommendations',
  'menu.roi_tracker',
  'menu.ledger',
]);
const ACREAGE_IDS = new Set(['acreage.0_1', 'acreage.2_5', 'acreage.5_plus']);
const SOIL_CONFIRM_IDS = new Set(['soil.confirm_yes', 'soil.confirm_no']);

export type ScenarioSenders = {
  text: (phone: string, text: string) => Promise<void>;
  list?: (params: {
    phone: string;
    body: string;
    buttonText: string;
    sections: Array<{
      title: string;
      rows: Array<{ id: string; title: string; description?: string }>;
    }>;
  }) => Promise<void>;
  buttons?: (params: {
    phone: string;
    body: string;
    buttons: Array<{ id: string; title: string }>;
  }) => Promise<void>;
};

export type ScenarioCapture = {
  farmerId: string;
  phone: string;
  language: AdvisoryLanguage;
  isPremium: boolean;
};

export type ScenarioRouterResult =
  | { handled: true }
  | { handled: false }
  | { handled: true; runDiagnosis: true; welcomePrefix?: string }
  | { handled: true; duplicateImage: true };

function effectiveLanguage(session: ConversationSession, fallback: AdvisoryLanguage): AdvisoryLanguage {
  return (session.preferred_language ?? fallback) as AdvisoryLanguage;
}

function isMenuCommand(text: string): boolean {
  return /^(menu|main menu|മെനു|மெனு)$/i.test(text.trim());
}

/** Map typed or button titles to stable menu ids. */
function resolveMenuAction(text: string): string | null {
  const t = text.trim();
  if (!t) return null;
  if (t.startsWith('menu.') || MENU_IDS.has(t)) return t.startsWith('menu.') ? t : t;

  const lower = t.toLowerCase();
  if (/^(weather|കാലാവസ്ഥ|வானிலை|ಹವಾಮಾನ|मौसम)$/i.test(lower)) return 'menu.weather';
  if (/^(market price|prices|price|വില|விலை|ಬೆಲೆ|भाव)$/i.test(lower)) return 'menu.prices';
  if (/^(crop assessment|diagnosis|രോഗനിർണയം|நோய்|ರೋಗ|रोग)/i.test(lower)) return 'menu.crop_assessment';
  if (/^more$/i.test(lower)) return 'menu.more';
  if (/^(roi|ledger|farm ledger)/i.test(lower)) return lower.includes('ledger') ? 'menu.ledger' : 'menu.roi_tracker';
  if (/^(previous|past).*(recommend|advice|ശുപാർശ)/i.test(lower)) return 'menu.prev_recommendations';
  if (/^(track order|order track|ഓർഡർ|ஆர்டர்|ಆರ್ಡರ್|ऑर्डर)/i.test(lower)) return 'menu.track_order';
  if (/^(call back|callback|കോൾബാക്ക്|கால்பேக்|ಕಾಲ್|कॉलबैक)/i.test(lower)) return 'menu.expert';
  if (/^(soil test|soil|മണ്ണ്|மண்|ಮಣ್ಣು|मिट्टी)/i.test(lower)) return 'menu.soil';

  return null;
}

function isChangePlotCommand(text: string): boolean {
  return /^(change plot|switch plot|plot change|മറ്റ് പ്ലോട്ട്|ப்ளாட் மாற்று)$/i.test(text.trim());
}

function isFarmerResetCommand(text: string): boolean {
  const t = text.trim().toLowerCase();
  return (
    /^(delete my data|erase my data|reset account|reset my account|delete account|forget me)$/i.test(t) ||
    /^(ഡാറ്റ ഇല്ലാതാക്കുക|എന്റെ ഡാറ്റ മായ്ക്കുക|അക്കൗണ്ട് റീസെറ്റ്)$/i.test(t) ||
    /^(मेरा डेटा हटाएं|खाता रीसेट)$/i.test(t)
  );
}

function farmerResetAck(lang: AdvisoryLanguage): string {
  const map: Record<AdvisoryLanguage, string> = {
    en: 'Your Morbeez data has been fully removed. Send *Hi* anytime to register as a new farmer.',
    ml: 'നിങ്ങളുടെ മോർബീസ് ഡാറ്റ പൂർണ്ണമായും ഇല്ലാതാക്കി. പുതിയ കർഷകനായി രജിസ്റ്റർ ചെയ്യാൻ *Hi* അയയ്ക്കുക.',
    ta: 'உங்கள் Morbeez தரவு முழுமையாக நீக்கப்பட்டது. புதிய விவசாயியாக பதிவு செய்ய *Hi* அனுப்பவும்.',
    kn: 'ನಿಮ್ಮ Morbeez ಡೇಟಾ ಸಂಪೂರ್ಣವಾಗಿ ಅಳಿಸಲಾಗಿದೆ. ಹೊಸ ರೈತರಾಗಿ ನೋಂದಣಿಗೆ *Hi* ಕಳುಹಿಸಿ.',
    hi: 'आपका Morbeez डेटा पूरी तरह हटा दिया गया है। नए किसान के रूप में पंजीकरण के लिए *Hi* भेजें।',
  };
  return map[lang] ?? map.en;
}

function parseAcreageBucket(text: string): '0_1' | '2_5' | '5_plus' | null {
  const t = text.trim().toLowerCase();
  if (t === 'acreage.0_1' || /^0\s*-\s*1/.test(t) || /0\s*to\s*1/.test(t)) return '0_1';
  if (t === 'acreage.2_5' || /^2\s*-\s*5/.test(t) || /2\s*to\s*5/.test(t)) return '2_5';
  if (t === 'acreage.5_plus' || /^5\+/.test(t) || /more than 5|5 plus/.test(t)) return '5_plus';
  return null;
}

function acreageValue(bucket: '0_1' | '2_5' | '5_plus'): number {
  if (bucket === '0_1') return 1;
  if (bucket === '2_5') return 3.5;
  return 6;
}

function parsePlantingDateDDMMYYYY(text: string): string | null {
  const digits = text.replace(/\D/g, '');
  if (digits.length !== 8) return null;
  const dd = Number(digits.slice(0, 2));
  const mm = Number(digits.slice(2, 4));
  const yyyy = Number(digits.slice(4, 8));
  if (yyyy < 2000 || yyyy > 2100 || mm < 1 || mm > 12 || dd < 1 || dd > 31) return null;
  const d = new Date(Date.UTC(yyyy, mm - 1, dd));
  if (d.getUTCFullYear() !== yyyy || d.getUTCMonth() !== mm - 1 || d.getUTCDate() !== dd) return null;
  return `${yyyy}-${String(mm).padStart(2, '0')}-${String(dd).padStart(2, '0')}`;
}

export const whatsappScenarioRouter = {
  async askSoilReportConfirmation(
    phone: string,
    farmerId: string,
    lang: AdvisoryLanguage,
    send: ScenarioSenders
  ): Promise<void> {
    const body =
      lang === 'ml'
        ? 'വളം ശുപാർശയ്ക്ക് മുമ്പ്: മണ്ണ് പരിശോധന റിപ്പോർട്ട് (PDF/ഫോട്ടോ) ഉണ്ടോ?'
        : 'Before fertilizer advice: do you have a soil test report (PDF or photo)?';
    const options = [
      { id: 'soil.confirm_yes', title: 'Yes' },
      { id: 'soil.confirm_no', title: 'No' },
    ];
    if (send.buttons) {
      await send.buttons({
        phone,
        body,
        buttons: options,
      });
    } else if (send.list) {
      await send.list({
        phone,
        body,
        buttonText: lang === 'ml' ? 'തിരഞ്ഞെടുക്കുക' : 'Choose',
        sections: [{ title: 'Soil report', rows: options }],
      });
    } else {
      await send.text(phone, `${body}\n\nYes / No`);
    }
    await conversationSessionService.setState(farmerId, 'nutrient_soil_confirm');
  },

  async startMinimalOnboarding(
    phone: string,
    farmerId: string,
    lang: AdvisoryLanguage,
    send: ScenarioSenders
  ): Promise<void> {
    await blockService.ensureDefaultBlock(farmerId);
    await conversationSessionService.patchContext(farmerId, {
      onboardingComplete: false,
      onboardingStep: 'pincode',
      onboardingAcreageBucket: undefined,
    });
    await conversationSessionService.setState(farmerId, 'onboarding_minimal');
    await send.text(phone, pincodePrompt(lang));
  },

  async sendAcreageOnboardingStep(
    phone: string,
    lang: AdvisoryLanguage,
    send: ScenarioSenders
  ): Promise<void> {
    const copy =
      lang === 'ml'
        ? 'എത്ര ഏക്കർ കൃഷിയുണ്ട്?'
        : 'How many acres are under cultivation?';
    const options = [
      { id: 'acreage.0_1', title: '0-1 acre' },
      { id: 'acreage.2_5', title: '2-5 acre' },
      { id: 'acreage.5_plus', title: '5+ acre' },
    ];
    if (send.list) {
      await send.list({
        phone,
        body: copy,
        buttonText: lang === 'ml' ? 'ഏക്കർ' : 'Acre',
        sections: [{ title: 'Cultivation area', rows: options }],
      });
      return;
    }
    if (send.buttons) {
      await sendReplyButtonMenu({
        to: phone,
        body: copy,
        options,
        sendButtons: (p) =>
          send.buttons!({
            phone: p.to,
            body: p.body,
            buttons: p.buttons,
          }),
      });
      return;
    }
    await send.text(phone, `${copy}\n\n0-1 acre / 2-5 acre / 5+ acre`);
  },

  async sendPlotPicker(
    phone: string,
    farmerId: string,
    lang: AdvisoryLanguage,
    send: ScenarioSenders,
    pendingText?: string
  ): Promise<void> {
    const plots = await multiPlotService.listPlots(farmerId);
    if (plots.length < 2) return;

    if (pendingText) {
      await conversationSessionService.patchContext(farmerId, { pendingSymptomsText: pendingText });
    }

    const list = multiPlotService.buildPlotList(plots, lang);
    const options = list.sections.flatMap((s) =>
      s.rows.map((r) => ({ id: r.id, title: r.title }))
    );

    if (send.list) {
      await send.list({ phone, body: list.body, buttonText: list.buttonText, sections: list.sections });
    } else if (send.buttons) {
      await sendReplyButtonMenu({
        to: phone,
        body: list.body,
        options,
        continuationBody: 'More plots — tap a button:',
        sendButtons: (p) =>
          send.buttons!({
            phone: p.to,
            body: p.body,
            buttons: p.buttons,
          }),
      });
    } else {
      const names = plots.map((p) => p.crop_type).join(' / ');
      await send.text(phone, `${list.body}\n\nReply: ${names}`);
    }
    await conversationSessionService.setState(farmerId, 'plot_select');
  },

  async applyPlotSelection(
    msg: InboundMessage,
    captured: ScenarioCapture,
    lang: AdvisoryLanguage,
    plotId: string,
    send: ScenarioSenders
  ): Promise<void> {
    const plots = await multiPlotService.listPlots(captured.farmerId);
    const plot = plots.find((p) => p.id === plotId);
    if (!plot) {
      await send.text(msg.phone, t('mainMenuHint', lang));
      return;
    }

    await multiPlotService.setActivePlot(captured.farmerId, plot);
    const ctx = await conversationSessionService.getContext(captured.farmerId);
    await send.text(msg.phone, multiPlotService.plotConfirmedMessage(plot, lang));

    if (ctx.pendingSymptomsText) {
      await conversationSessionService.patchContext(captured.farmerId, {
        pendingSymptomsText: undefined,
      });
      await conversationSessionService.setState(captured.farmerId, 'diagnosis_awaiting_photos');
      return;
    }

    await conversationSessionService.setState(captured.farmerId, 'diagnosis_awaiting_photos');
  },

  async tryRoute(
    msg: InboundMessage,
    captured: ScenarioCapture,
    session: ConversationSession,
    send: ScenarioSenders
  ): Promise<ScenarioRouterResult> {
    const lang = effectiveLanguage(session, captured.language);
    const text = (msg.text ?? '').trim();

    if (!session.preferred_language) {
      return { handled: false };
    }

    // Scenario 44 — always use stored language
    captured.language = lang;

    const roiStates = new Set(['roi_entry', 'roi_set_pin', 'roi_edit_pin', 'roi_edit_amount']);
    if (roiStates.has(session.state) || roiFlowService.isRoiButton(text)) {
      const roiHandled = await roiFlowService.tryHandleInbound({
        farmerId: captured.farmerId,
        phone: msg.phone,
        language: lang,
        text,
        send,
        sessionState: session.state,
      });
      if (roiHandled) return { handled: true };
    }

    if (text && isFarmerResetCommand(text)) {
      await farmerPurgeService.purgeByPhone(captured.phone);
      await send.text(msg.phone, farmerResetAck(lang));
      return { handled: true };
    }

    if (session.state === 'farmer_feedback_capture') {
      const capturedFb = await farmerFeedbackFlowService.tryHandleCapture({
        farmerId: captured.farmerId,
        phone: msg.phone,
        lang,
        text,
        send,
      });
      if (capturedFb) return { handled: true };
    }

    if (
      text &&
      (text === 'feedback.disagree' || farmerFeedbackFlowService.isDisagreementIntent(text))
    ) {
      const canStart = await farmerFeedbackFlowService.canStartDisagreement(captured.farmerId);
      if (canStart?.sessionId) {
        await farmerFeedbackFlowService.startFlow({
          farmerId: captured.farmerId,
          phone: msg.phone,
          lang,
          send,
          initialText: text === 'feedback.disagree' ? undefined : text,
        });
        return { handled: true };
      }
    }

    // Recommendation follow-up buttons (application + Day-5 outcome)
    if (text?.startsWith('rec.')) {
      const recId = await recommendationFollowUpService.resolvePendingRecommendationId(
        captured.farmerId
      );
      if (recId) {
        let reply: string;
        if (text === 'rec.apply_yes') {
          reply = await recommendationFollowUpService.handleApplicationReply(
            captured.farmerId,
            recId,
            'yes_applied'
          );
        } else if (text === 'rec.apply_not') {
          reply = await recommendationFollowUpService.handleApplicationReply(
            captured.farmerId,
            recId,
            'not_yet'
          );
        } else if (text === 'rec.apply_help') {
          reply = await recommendationFollowUpService.handleApplicationReply(
            captured.farmerId,
            recId,
            'need_clarification'
          );
        } else if (text === 'rec.outcome_yes') {
          reply = await recommendationFollowUpService.handleOutcomeReply(
            captured.farmerId,
            recId,
            'improved'
          );
        } else if (text === 'rec.outcome_no') {
          reply = await recommendationFollowUpService.handleOutcomeReply(
            captured.farmerId,
            recId,
            'no_improvement'
          );
        } else if (text === 'rec.outcome_worse') {
          reply = await recommendationFollowUpService.handleOutcomeReply(
            captured.farmerId,
            recId,
            'worsened'
          );
        } else {
          return { handled: false };
        }
        await send.text(msg.phone, reply);
        return { handled: true };
      }
    }

    // Follow-up outcome capture (Step 8/9) — legacy free-text + recommendation engine
    if (text && /^(improved|better|partial|no improvement|worse|worsening)$/i.test(text)) {
      const ctx = await conversationSessionService.getContext(captured.farmerId);
      const recId =
        ctx.pendingRecommendationRecordId ??
        (await recommendationFollowUpService.resolvePendingRecommendationId(captured.farmerId));
      if (recId && ctx.pendingRecommendationFollowUp === 'outcome') {
        const normalized = text.toLowerCase();
        const reply = await recommendationFollowUpService.handleOutcomeReply(
          captured.farmerId,
          recId,
          normalized.includes('worse')
            ? 'worsened'
            : normalized.includes('no improvement')
              ? 'no_improvement'
              : normalized.includes('partial')
                ? 'partial'
                : 'improved'
        );
        await send.text(msg.phone, reply);
        return { handled: true };
      }

      const normalized = text.toLowerCase();
      const outcome =
        normalized.includes('worse')
          ? 'worsened'
          : normalized.includes('no improvement')
            ? 'no_improvement'
            : normalized.includes('partial')
              ? 'partial'
              : 'improved';
      await accuracyMetricsService.logFollowupOutcome({
        farmerId: captured.farmerId,
        sessionId: ctx.diagnosis?.lastSessionId,
        outcome,
        notes: `Inbound follow-up: ${text}`,
      });
      if (outcome === 'no_improvement' || outcome === 'worsened') {
        await createTelecallerTask({
          farmerId: captured.farmerId,
          title: outcome === 'worsened' ? 'Urgent escalation required' : 'No improvement follow-up',
          notes: `Farmer reported "${text}" after advisory.`,
          priority: outcome === 'worsened' ? 'urgent' : 'high',
        });
        await send.text(
          msg.phone,
          outcome === 'worsened'
            ? 'Thank you. We marked this as urgent. Our agronomist team will call you within 4 hours.'
            : 'Thank you. Since improvement is low, our team will review and contact you soon.'
        );
      } else {
        await send.text(msg.phone, 'Glad to hear progress. Please share updated photos after 3 days.');
      }
      return { handled: true };
    }

    if (session.state === 'onboarding_minimal') {
      let ctx = await conversationSessionService.getContext(captured.farmerId);
      if (!ctx.onboardingStep) {
        await this.startMinimalOnboarding(msg.phone, captured.farmerId, lang, send);
        return { handled: true };
      }
      await blockService.ensureDefaultBlock(captured.farmerId);
      const plots = await multiPlotService.listPlots(captured.farmerId);
      const primary = plots.find((p) => p.is_primary) ?? plots[0];
      if (!primary) {
        await send.text(msg.phone, t('mainMenuHint', lang));
        return { handled: true };
      }

      if (CROP_MEDIA.has(msg.msgType) && ctx.onboardingStep !== 'planting_date') {
        await send.text(msg.phone, onboardingFlowService.currentStepPrompt(ctx.onboardingStep, lang));
        return { handled: true };
      }

      if (ctx.onboardingStep === 'pincode') {
        const pc = text ? parsePincodeInput(text) : null;
        if (!pc) {
          await send.text(msg.phone, invalidPincodeReply(lang));
          return { handled: true };
        }
        const row = await pincodeService.assignFarmerPincode(captured.farmerId, pc);
        if (!row) {
          await send.text(msg.phone, invalidPincodeReply(lang));
          return { handled: true };
        }
        await conversationSessionService.patchContext(captured.farmerId, {
          onboardingStep: 'acreage',
        });
        await send.text(msg.phone, pincodeSavedReply(lang, row.district, row.state));
        await this.sendAcreageOnboardingStep(msg.phone, lang, send);
        return { handled: true };
      }

      if (ctx.onboardingStep === 'acreage' || ACREAGE_IDS.has(text)) {
        const bucket = parseAcreageBucket(text);
        if (!bucket) {
          await send.text(
            msg.phone,
            lang === 'ml'
              ? 'ദയവായി തിരഞ്ഞെടുക്കുക: 0-1 acre / 2-5 acre / 5+ acre'
              : 'Please choose: 0-1 acre / 2-5 acre / 5+ acre'
          );
          return { handled: true };
        }
        await supabase
          .from('farm_blocks')
          .update({ acreage_decimal: acreageValue(bucket) })
          .eq('id', primary.id)
          .eq('farmer_id', captured.farmerId);
        await conversationSessionService.patchContext(captured.farmerId, {
          onboardingStep: 'crop',
          onboardingAcreageBucket: bucket,
        });
        await cropSelectionService.sendCropPicker({
          farmerId: captured.farmerId,
          phone: msg.phone,
          language: lang,
          send,
          body:
            lang === 'ml'
              ? 'ഏത് പ്ലോട്ട് (വിള) കൃഷി ചെയ്യുന്നു?'
              : lang === 'ta'
                ? 'எந்த ப்ளாட் (பயிர்)?'
                : lang === 'kn'
                  ? 'ಯಾವ ಪ್ಲಾಟ್ (ಬೆಳೆ)?'
                  : lang === 'hi'
                    ? 'कौन सा प्लॉट (फसल)?'
                    : 'Which plot (crop) do you cultivate?',
        });
        return { handled: true };
      }

      if (ctx.onboardingStep === 'crop') {
        const pick = await cropSelectionService.resolveSelection(captured.farmerId, text);
        if (!pick) {
          await cropSelectionService.sendCropPicker({
            farmerId: captured.farmerId,
            phone: msg.phone,
            language: lang,
            send,
          });
          return { handled: true };
        }
        if (pick.kind === 'other') {
          await conversationSessionService.patchContext(captured.farmerId, {
            onboardingStep: 'custom_crop',
          });
          await send.text(msg.phone, cropSelectionService.customCropPrompt(lang));
          return { handled: true };
        }
        if (pick.kind === 'custom') {
          await cropSelectionService.registerCustomCrop(captured.farmerId, pick.label);
        }
        await cropSelectionService.applyCropToPrimaryBlock(
          captured.farmerId,
          pick.slug,
          pick.kind === 'custom' ? pick.label : undefined
        );
        await conversationSessionService.patchContext(captured.farmerId, {
          onboardingStep: 'planting_date',
        });
        await send.text(msg.phone, plantingDatePrompt(lang));
        return { handled: true };
      }

      if (ctx.onboardingStep === 'custom_crop' && text && !text.startsWith('crop.')) {
        const custom = await cropSelectionService.registerCustomCrop(captured.farmerId, text);
        await cropSelectionService.applyCropToPrimaryBlock(
          captured.farmerId,
          custom.slug,
          custom.label
        );
        await conversationSessionService.patchContext(captured.farmerId, {
          onboardingStep: 'planting_date',
        });
        await send.text(msg.phone, plantingDatePrompt(lang));
        return { handled: true };
      }

      if (ctx.onboardingStep === 'planting_date') {
        const plantingDate = parsePlantingDateDDMMYYYY(text);
        if (!plantingDate) {
          await send.text(
            msg.phone,
            lang === 'ml'
              ? 'തീയതി DDMMYYYY ഫോർമാറ്റിൽ അയക്കുക. ഉദാ: 28052026'
              : 'Please send date in DDMMYYYY format. Example: 28052026'
          );
          return { handled: true };
        }
        await supabase
          .from('farm_blocks')
          .update({ planting_date: plantingDate })
          .eq('id', primary.id)
          .eq('farmer_id', captured.farmerId);
        await onboardingFlowService.markComplete(captured.farmerId);
        await this.showMainMenu(msg.phone, lang, send);
        return { handled: true };
      }

      if (text || CROP_MEDIA.has(msg.msgType)) {
        await send.text(msg.phone, onboardingFlowService.currentStepPrompt(ctx.onboardingStep, lang));
        return { handled: true };
      }
    }

    if (session.state === 'nutrient_soil_confirm' || SOIL_CONFIRM_IDS.has(text)) {
      if (CROP_MEDIA.has(msg.msgType) || msg.msgType === 'document') {
        await nutrientSoilGateService.markSoilReportReceived(captured.farmerId);
        await send.text(msg.phone, soilFlowService.reportReceivedReply(lang));
        const delivered = await nutrientSoilGateService.deliverPending({
          farmerId: captured.farmerId,
          phone: msg.phone,
          language: lang,
          sendText: send.text,
          extraFooter:
            lang === 'ml'
              ? 'മണ്ണ് റിപ്പോർട്ട് ലഭിച്ചു — ഈ മാർഗ്ഗനിർദേശം അതിനെ അടിസ്ഥാനമാക്കി ക്രമീകരിക്കാം.'
              : 'Soil report received — we can refine this advice with your lab values.',
        });
        if (delivered) {
          await this.afterDiagnosis({
            phone: msg.phone,
            farmerId: captured.farmerId,
            lang,
            sessionId: delivered.sessionId,
            advisory: delivered.advisory,
            summary: delivered.summary,
            send,
            skipNutrientSoilAsk: true,
          });
        }
        await conversationSessionService.setState(captured.farmerId, 'main_menu');
        return { handled: true };
      }

      const normalized = text.trim().toLowerCase();
      if (
        normalized === 'soil.confirm_yes' ||
        /^yes$/i.test(normalized) ||
        /ഉണ്ട്|ஆம்|ಹೌದು|हाँ/.test(normalized)
      ) {
        await send.text(
          msg.phone,
          lang === 'ml'
            ? 'ദയവായി മണ്ണ് പരിശോധന റിപ്പോർട്ട് (PDF/ഫോട്ടോ) അപ്ലോഡ് ചെയ്യുക.'
            : 'Please upload your soil test report (PDF/photo).'
        );
        await conversationSessionService.setState(captured.farmerId, 'soil_flow');
        return { handled: true };
      }
      if (
        normalized === 'soil.confirm_no' ||
        /^no$/i.test(normalized) ||
        /ഇല്ല|இல்லை|ಇಲ್ಲ|नहीं/.test(normalized)
      ) {
        const noReportAddress: Record<AdvisoryLanguage, string> = {
          en: 'No problem. You can still send a sample to us for confirmation.\n\nMorbeez\nSulthan Bathery\nWayanad - 673592',
          ml: 'പ്രശ്നമില്ല. സ്ഥിരീകരണത്തിന് സാമ്പിൾ ഞങ്ങളിലേക്ക് അയക്കാം.\n\nMorbeez\nSulthan Bathery\nWayanad - 673592',
          ta: 'பிரச்சனை இல்லை. உறுதிப்படுத்த மாதிரியை எங்களிடம் அனுப்பலாம்.\n\nMorbeez\nSulthan Bathery\nWayanad - 673592',
          kn: 'ಸಮಸ್ಯೆ ಇಲ್ಲ. ದೃಢೀಕರಣಕ್ಕಾಗಿ ಮಾದರಿಯನ್ನು ನಮಗೆ ಕಳುಹಿಸಬಹುದು.\n\nMorbeez\nSulthan Bathery\nWayanad - 673592',
          hi: 'कोई समस्या नहीं। पुष्टि के लिए आप सैंपल हमें भेज सकते हैं।\n\nMorbeez\nSulthan Bathery\nWayanad - 673592',
        };
        await send.text(
          msg.phone,
          noReportAddress[lang] ?? noReportAddress.en
        );
        const noReportFooter =
          lang === 'ml'
            ? 'മണ്ണ് റിപ്പോർട്ട് ഇല്ലാതെ: താഴെ പൊതു മാർഗ്ഗനിർദേശം മാത്രം (സ്ഥിരീകരണം ആവശ്യം).'
            : 'Without a soil report: general guidance only (needs confirmation).';
        const delivered = await nutrientSoilGateService.deliverPending({
          farmerId: captured.farmerId,
          phone: msg.phone,
          language: lang,
          sendText: send.text,
          extraFooter: noReportFooter,
        });
        if (delivered) {
          await this.afterDiagnosis({
            phone: msg.phone,
            farmerId: captured.farmerId,
            lang,
            sessionId: delivered.sessionId,
            advisory: delivered.advisory,
            summary: delivered.summary,
            send,
            skipNutrientSoilAsk: true,
          });
        }
        await conversationSessionService.setState(captured.farmerId, 'main_menu');
        return { handled: true };
      }
      await send.text(
        msg.phone,
        lang === 'ml'
          ? 'ദയവായി Yes അല്ലെങ്കിൽ No തിരഞ്ഞെടുക്കുക.'
          : 'Please choose Yes or No.'
      );
      return { handled: true };
    }

    // Scenarios 30–31, 37 — cultivation logging
    if (
      text.startsWith('cult.') ||
      /^applied$/i.test(text) ||
      cultivationLoggingService.isSprayCompletedMessage(text)
    ) {
      const cult = await cultivationLoggingService.handleInboundAction({
        farmerId: captured.farmerId,
        phone: msg.phone,
        language: lang,
        action: text,
        text,
      });
      if (cult.handled) return { handled: true };
    }

    // Scenarios 35–36 — order tracking & payment buttons
    if (
      text.startsWith('order.') ||
      text.startsWith('pay.') ||
      /^track\b/i.test(text) ||
      /order status/i.test(text) ||
      /^retry$/i.test(text) ||
      /^cod$/i.test(text)
    ) {
      const handled = await orderWhatsappService.handleInboundAction({
        phone: msg.phone,
        farmerId: captured.farmerId,
        language: lang,
        action: text,
        text,
      });
      if (handled) return { handled: true };
    }

    if (isMenuCommand(text)) {
      const onboardingDone = await onboardingFlowService.isComplete(captured.farmerId);
      if (onboardingDone) {
        await this.showReturningFarmerWelcome(msg, captured, lang, send);
      } else {
        await this.showMainMenu(msg.phone, lang, send);
        await conversationSessionService.setState(captured.farmerId, 'main_menu');
      }
      return { handled: true };
    }

    if (isChangePlotCommand(text)) {
      await conversationSessionService.clearActivePlot(captured.farmerId);
      await this.sendPlotPicker(msg.phone, captured.farmerId, lang, send);
      return { handled: true };
    }

    const ctxForCrop = await conversationSessionService.getContext(captured.farmerId);
    const inOnboardingCropFlow =
      session.state === 'onboarding_minimal' &&
      (ctxForCrop.onboardingStep === 'crop' ||
        ctxForCrop.onboardingStep === 'custom_crop' ||
        ctxForCrop.onboardingStep === 'planting_date');

    if ((session.state === 'crop_select' || text.startsWith('crop.')) && !inOnboardingCropFlow) {
      const pick = await cropSelectionService.resolveSelection(captured.farmerId, text);
      if (!pick) {
        await cropSelectionService.sendCropPicker({
          farmerId: captured.farmerId,
          phone: msg.phone,
          language: lang,
          send,
          body:
            lang === 'ml'
              ? 'വിള കണ്ടെത്താനായില്ല. ദയവായി പ്ലോട്ട് തിരഞ്ഞെടുക്കുക.'
              : 'AI could not detect crop clearly. Please select your plot.',
        });
        return { handled: true };
      }
      if (pick.kind === 'other') {
        const ctxBefore = await conversationSessionService.getContext(captured.farmerId);
        const isOnboardingCrop = ctxBefore.onboardingStep === 'crop';
        await conversationSessionService.patchContext(captured.farmerId, {
          pendingCropSelection: true,
          onboardingStep: isOnboardingCrop ? 'custom_crop' : undefined,
        });
        await send.text(msg.phone, cropSelectionService.customCropPrompt(lang));
        return { handled: true };
      }
      if (pick.kind === 'custom') {
        await cropSelectionService.registerCustomCrop(captured.farmerId, pick.label);
      }
      const cropSlug = pick.slug;
      const cropLabel = pick.kind === 'custom' ? pick.label : undefined;
      let plot = await multiPlotService.setActivePlotByCropSlug(captured.farmerId, cropSlug);
      if (!plot) {
        await cropSelectionService.applyCropToPrimaryBlock(captured.farmerId, cropSlug, cropLabel);
        plot = await multiPlotService.setActivePlotByCropSlug(captured.farmerId, cropSlug);
        if (!plot) {
          const allPlots = await multiPlotService.listPlots(captured.farmerId);
          if (allPlots[0]) {
            await multiPlotService.setActivePlot(captured.farmerId, allPlots[0]);
            plot = allPlots[0];
          }
        }
      }
      await conversationSessionService.patchContext(captured.farmerId, {
        pendingCropSelection: false,
        onboardingStep: undefined,
        activeCropType: cropSlug,
        activePlotLabel: plot?.plot_label ?? (plot ? `${plot.crop_type} plot` : undefined),
      });
      await conversationSessionService.setState(captured.farmerId, 'diagnosis_awaiting_photos');
      await send.text(msg.phone, t('diagnosisPrompt', lang));
      return { handled: true };
    }

    const ctxCrop = await conversationSessionService.getContext(captured.farmerId);
    if (ctxCrop.pendingCropSelection && ctxCrop.onboardingStep === 'custom_crop' && text && !text.startsWith('crop.')) {
      const custom = await cropSelectionService.registerCustomCrop(captured.farmerId, text);
      await cropSelectionService.applyCropToPrimaryBlock(
        captured.farmerId,
        custom.slug,
        custom.label
      );
      const inOnboarding = session.state === 'onboarding_minimal';
      if (inOnboarding) {
        await conversationSessionService.patchContext(captured.farmerId, {
          pendingCropSelection: false,
          onboardingStep: 'planting_date',
        });
        await send.text(msg.phone, plantingDatePrompt(lang));
      } else {
        await conversationSessionService.patchContext(captured.farmerId, {
          pendingCropSelection: false,
          onboardingStep: undefined,
          activeCropType: custom.slug,
        });
        await multiPlotService.setActivePlotByCropSlug(captured.farmerId, custom.slug);
        await conversationSessionService.setState(captured.farmerId, 'diagnosis_awaiting_photos');
        await send.text(msg.phone, t('diagnosisPrompt', lang));
      }
      return { handled: true };
    }

    if (ctxCrop.pendingCropSelection && !ctxCrop.onboardingStep && text && !text.startsWith('crop.')) {
      const custom = await cropSelectionService.registerCustomCrop(captured.farmerId, text);
      await cropSelectionService.applyCropToPrimaryBlock(captured.farmerId, custom.slug, custom.label);
      await multiPlotService.setActivePlotByCropSlug(captured.farmerId, custom.slug);
      await conversationSessionService.patchContext(captured.farmerId, {
        pendingCropSelection: false,
        activeCropType: custom.slug,
      });
      await conversationSessionService.setState(captured.farmerId, 'diagnosis_awaiting_photos');
      await send.text(msg.phone, t('diagnosisPrompt', lang));
      return { handled: true };
    }

    // Scenario 29 — plot selection (list/button reply)
    if (text.startsWith('plot.') || session.state === 'plot_select') {
      const plots = await multiPlotService.listPlots(captured.farmerId);
      const selected = multiPlotService.parsePlotSelection(text, plots);
      if (selected) {
        await this.applyPlotSelection(msg, captured, lang, selected.id, send);
        return { handled: true };
      }
      if (session.state === 'plot_select') {
        await this.sendPlotPicker(msg.phone, captured.farmerId, lang, send, text || undefined);
        return { handled: true };
      }
    }

    // Scenario 29 — multi-crop message ("Ginger fine, cardamom has issue")
    if (text) {
      const plots = await multiPlotService.listPlots(captured.farmerId);
      if (plots.length >= 2) {
        const analysis = multiPlotService.analyzeMultiCropMessage(text, plots);
        if (analysis.needsPlotPicker) {
          if (analysis.suggestedPlot && analysis.cropsWithIssue.length === 1) {
            await multiPlotService.setActivePlot(captured.farmerId, analysis.suggestedPlot);
            await conversationSessionService.patchContext(captured.farmerId, {
              pendingSymptomsText: text,
            });
            await send.text(
              msg.phone,
              multiPlotService.plotConfirmedMessage(analysis.suggestedPlot, lang)
            );
            await conversationSessionService.setState(captured.farmerId, 'diagnosis_awaiting_photos');
            return { handled: true };
          }
          await this.sendPlotPicker(msg.phone, captured.farmerId, lang, send, text);
          return { handled: true };
        }
        if (analysis.suggestedPlot && analysis.cropsMentioned.length === 1) {
          await multiPlotService.setActivePlot(captured.farmerId, analysis.suggestedPlot);
        }
      }
    }

    // Main menu selection (list/button ids or typed labels like "Weather")
    const menuAction = resolveMenuAction(text);
    if (menuAction) {
      await this.handleMenuSelection(msg, captured, lang, normalizeMenuId(menuAction), send);
      return { handled: true };
    }

    // Water volume / post-diagnosis actions
    if (text.startsWith('water.') || session.state === 'diagnosis_water_volume') {
      const handled = await this.handleWaterVolume(msg, captured, lang, text, send);
      if (handled) return { handled: true };
    }

    if (text === 'action.callback' || /^callback$/i.test(text)) {
      await send.text(msg.phone, await callbackFlowService.createCallback(captured.farmerId, lang));
      return { handled: true };
    }

    if (/^technical$/i.test(text) || text === 'action.technical') {
      const ctx = await conversationSessionService.getContext(captured.farmerId);
      if (ctx.diagnosis?.lastAdvisorySummary) {
        await send.text(msg.phone, ctx.diagnosis.lastAdvisorySummary);
      } else if (ctx.diagnosis?.dosageItems?.length) {
        await send.text(
          msg.phone,
          diagnosisFlowService.technicalOnlyReply(
            { dosageGuidance: ctx.diagnosis.dosageItems } as import('../../ai/types.js').StructuredAdvisory,
            lang
          )
        );
      }
      return { handled: true };
    }

    // Soil sub-menu
    if (text.startsWith('soil.')) {
      await this.handleSoilAction(msg, captured, lang, text, send);
      return { handled: true };
    }

    // Chimb follow-up buttons (Scenario 7)
    if (session.state === 'chimb_followup' && /^(chimb\.(yes|no|unsure)|yes|no)$/i.test(text)) {
      const answer = text.includes('no') ? 'no' : text.includes('yes') ? 'yes' : 'unsure';
      await conversationSessionService.patchContext(captured.farmerId, { chimbDrainage: answer });
      await send.text(msg.phone, terminologyService.chimbAdviceCopy(lang));
      await conversationSessionService.setState(captured.farmerId, 'diagnosis_awaiting_photos');
      return { handled: true };
    }

    // Scenario 7 — chimb issue
    if (text && terminologyService.isChimbIssue(text)) {
      await conversationSessionService.setState(captured.farmerId, 'chimb_followup');
      if (send.buttons) {
        await send.buttons({
          phone: msg.phone,
          body: terminologyService.chimbQuestionCopy(lang),
          buttons: [
            { id: 'chimb.yes', title: 'Yes' },
            { id: 'chimb.no', title: 'No' },
            { id: 'chimb.unsure', title: 'Not Sure' },
          ],
        });
      } else {
        await send.text(msg.phone, terminologyService.chimbQuestionCopy(lang));
      }
      return { handled: true };
    }

    // Scenario 8 — unknown terminology
    if (text && terminologyService.isLikelyUnknownRegionalPhrase(text)) {
      const { data: farmer } = await supabase
        .from('farmers')
        .select('district')
        .eq('id', captured.farmerId)
        .maybeSingle();
      const resolved = await terminologyService.resolveTerm(
        text,
        lang,
        farmer?.district,
        undefined
      );
      if (!resolved.found || resolved.confidence < 0.6) {
        await terminologyService.createReviewTask({
          farmerId: captured.farmerId,
          term: text,
          language: lang,
          district: farmer?.district ?? undefined,
          contextText: text,
        });
        await conversationSessionService.setState(captured.farmerId, 'terminology_clarify');
        await send.text(msg.phone, terminologyService.clarifyCopy(lang));
        return { handled: true };
      }
    }

    // Scenario 12 — low yield without soil report
    if (
      text &&
      /\b(yield|production|harvest).*(low|poor|kam|കുറ|குற|ಕಮಿ|कम)\b/i.test(text)
    ) {
      const hasReport = await soilFlowService.hasSoilReport(captured.farmerId);
      if (!hasReport) {
        const soil = await soilFlowService.handleLowYieldWithoutReport(captured.farmerId, lang);
        await send.text(msg.phone, soil.body);
        if (send.list) {
          await send.list({ phone: msg.phone, ...soil.list });
        }
        await conversationSessionService.setState(captured.farmerId, 'soil_flow');
        return { handled: true };
      }
    }

    // Soil report upload (PDF / photo) while in soil flow
    if ((msg.msgType === 'document' || CROP_MEDIA.has(msg.msgType)) && session.state === 'soil_flow') {
      await nutrientSoilGateService.markSoilReportReceived(captured.farmerId);
      await send.text(msg.phone, soilFlowService.reportReceivedReply(lang));
      const delivered = await nutrientSoilGateService.deliverPending({
        farmerId: captured.farmerId,
        phone: msg.phone,
        language: lang,
        sendText: send.text,
        extraFooter:
          lang === 'ml'
            ? 'മണ്ണ് റിപ്പോർട്ട് ലഭിച്ചു — ഈ മാർഗ്ഗനിർദേശം അതിനെ അടിസ്ഥാനമാക്കി ക്രമീകരിക്കാം.'
            : 'Soil report received — we can refine this advice with your lab values.',
      });
      if (delivered) {
        await this.afterDiagnosis({
          phone: msg.phone,
          farmerId: captured.farmerId,
          lang,
          sessionId: delivered.sessionId,
          advisory: delivered.advisory,
          summary: delivered.summary,
          send,
          skipNutrientSoilAsk: true,
        });
      }
      await conversationSessionService.setState(captured.farmerId, 'main_menu');
      return { handled: true };
    }

    // Scenario 2 — image in diagnosis flow
    if (CROP_MEDIA.has(msg.msgType)) {
      const plots = await multiPlotService.listPlots(captured.farmerId);
      const activePlotId = await multiPlotService.getActivePlotId(captured.farmerId);
      if (plots.length >= 2 && !activePlotId) {
        if (msg.text?.trim()) {
          const selectedFromText = multiPlotService.parsePlotSelection(msg.text, plots);
          if (selectedFromText) {
            await multiPlotService.setActivePlot(captured.farmerId, selectedFromText);
          } else {
            const requested = await cropSelectionService.resolveSelection(
              captured.farmerId,
              msg.text
            );
            const requestedCrop =
              requested && requested.kind !== 'other' ? requested.slug : null;
            if (requestedCrop && !plots.some((p) => p.crop_type.toLowerCase() === requestedCrop)) {
              await send.text(
                msg.phone,
                lang === 'ml'
                  ? `നിങ്ങൾ ${requestedCrop} എന്ന് പറഞ്ഞു, പക്ഷേ ഇപ്പോഴത്തെ പ്ലോട്ടുകൾ വേറെയാണ്. പ്രശ്നമുള്ള പ്ലോട്ട് തിരഞ്ഞെടുക്കൂ.`
                  : `You mentioned ${requestedCrop}, but your saved plots are different. Please choose the plot with the issue.`
              );
            }
          }
        }
      }

      if (plots.length >= 2 && !(await multiPlotService.getActivePlotId(captured.farmerId))) {
        await this.sendPlotPicker(msg.phone, captured.farmerId, lang, send, msg.text || undefined);
        return { handled: true };
      }
      if (plots.length === 1) {
        await multiPlotService.setActivePlot(captured.farmerId, plots[0]);
      }

      const diagnosisStates = new Set([
        'diagnosis_awaiting_photos',
        'diagnosis',
        'main_menu',
        'root_photos_requested',
        'plot_select',
      ]);
      if (diagnosisStates.has(session.state) || session.state === 'main_menu') {
        const { shouldRunDiagnosis } = await diagnosisFlowService.recordImageReceived(captured.farmerId);
        if (shouldRunDiagnosis) {
          const welcome = await farmerWelcomeService.buildWelcomeLine(captured.farmerId, lang);
          await send.text(msg.phone, diagnosisFlowService.analyzingPrompt(lang));
          return { handled: true, runDiagnosis: true, welcomePrefix: welcome ?? undefined };
        }
      }
    }

    if (session.state === 'diagnosis_awaiting_photos' && text) {
      await send.text(msg.phone, t('diagnosisPrompt', lang));
      return { handled: true };
    }

    if (session.state === 'soil_lab_entry' && text) {
      const handled = await this.handleSoilLabEntry(msg, captured, lang, text, send);
      if (handled) return { handled: true };
    }

    if (session.state === 'soil_flow' && text && !text.startsWith('soil.')) {
      await send.text(msg.phone, t('mainMenuHint', lang));
      return { handled: true };
    }

    return { handled: false };
  },

  async showReturningFarmerWelcome(
    msg: InboundMessage,
    captured: ScenarioCapture,
    lang: AdvisoryLanguage,
    send: ScenarioSenders
  ): Promise<void> {
    const smartGreeting = await returnUserGreetingService.buildSmartGreeting(
      captured.farmerId,
      lang
    );
    const welcomeOverride = smartGreeting
      ? `${smartGreeting.greeting}\n\n${smartGreeting.optionsIntro}`
      : lang === 'ml'
        ? 'സ്വാഗതം! നിങ്ങളെ എങ്ങനെ സഹായിക്കാം?'
        : lang === 'ta'
          ? 'வரவேற்கிறோம்! இன்று எப்படி உதவலாம்?'
          : lang === 'kn'
            ? 'ಸ್ವಾಗತ! ಇಂದು ಹೇಗೆ ಸಹಾಯ ಮಾಡಲಿ?'
            : lang === 'hi'
              ? 'स्वागत है! आज हम कैसे मदद करें?'
              : 'Welcome back! How can we help you today?';

    await this.showMainMenu(msg.phone, lang, send, {
      includeTrackOrder: smartGreeting?.includeTrackOrder ?? false,
      returningQuickActionsOnly: true,
      welcomeOverride,
    });
    await conversationSessionService.setState(captured.farmerId, 'main_menu');
  },

  async showMainMenu(
    phone: string,
    lang: AdvisoryLanguage,
    send: ScenarioSenders,
    options?: { includeTrackOrder?: boolean; welcomeOverride?: string; returningQuickActionsOnly?: boolean }
  ): Promise<void> {
    const menu = mainMenuCopy(lang, options);
    if (send.list) {
      await send.list({
        phone,
        body: menu.welcome,
        buttonText: menu.buttonText,
        sections: [{ title: 'Menu', rows: menu.rows }],
      });
    } else if (send.buttons) {
      await sendReplyButtonMenu({
        to: phone,
        body: menu.welcome,
        options: menu.rows.map((r) => ({ id: r.id, title: r.title })),
        continuationBody: 'More menu options:',
        sendButtons: (p) =>
          send.buttons!({
            phone: p.to,
            body: p.body,
            buttons: p.buttons,
          }),
      });
    } else {
      await send.text(phone, menu.welcome);
    }
  },

  async showMoreMenu(phone: string, lang: AdvisoryLanguage, send: ScenarioSenders): Promise<void> {
    const menu = moreMenuCopy(lang);
    if (send.list) {
      await send.list({
        phone,
        body: menu.body,
        buttonText: menu.buttonText,
        sections: [{ title: 'More', rows: menu.rows }],
      });
    } else if (send.buttons) {
      await sendReplyButtonMenu({
        to: phone,
        body: menu.body,
        options: menu.rows.map((r) => ({ id: r.id, title: r.title })),
        continuationBody: 'More options:',
        sendButtons: (p) =>
          send.buttons!({
            phone: p.to,
            body: p.body,
            buttons: p.buttons,
          }),
      });
    } else {
      await send.text(phone, menu.body);
    }
  },

  async handleMenuSelection(
    msg: InboundMessage,
    captured: ScenarioCapture,
    lang: AdvisoryLanguage,
    menuId: string,
    send: ScenarioSenders
  ): Promise<void> {
    const action = normalizeMenuId(menuId);
    switch (action) {
      case 'menu.more': {
        await this.showMoreMenu(msg.phone, lang, send);
        await conversationSessionService.setState(captured.farmerId, 'main_menu');
        break;
      }
      case 'menu.prev_recommendations': {
        const body = await previousRecommendationsService.formatForFarmer(captured.farmerId, lang);
        await send.text(msg.phone, body);
        await conversationSessionService.setState(captured.farmerId, 'main_menu');
        break;
      }
      case 'menu.ledger': {
        const ledger = await ledgerSummaryService.formatMonthlyLedger(captured.farmerId, lang);
        await send.text(msg.phone, ledger);
        await conversationSessionService.setState(captured.farmerId, 'main_menu');
        break;
      }
      case 'menu.roi_tracker': {
        await roiFlowService.startTracker({
          farmerId: captured.farmerId,
          phone: msg.phone,
          language: lang,
          send,
        });
        break;
      }
      case 'menu.crop_assessment':
      case 'menu.diagnosis': {
        const assessmentPlots = await multiPlotService.listPlots(captured.farmerId);
        const diagnoseBody =
          lang === 'ml'
            ? 'ഏത് പ്ലോട്ടിനാണ് രോഗനിർണയം വേണ്ടത്?'
            : lang === 'ta'
              ? 'எந்த ப்ளாட்டுக்கு நோய் கண்டறிதல் வேண்டும்?'
              : lang === 'kn'
                ? 'ಯಾವ ಪ್ಲಾಟ್‌ಗೆ ರೋಗ ನಿರ್ಧಾರ ಬೇಕು?'
                : lang === 'hi'
                  ? 'किस प्लॉट के लिए जांच चाहिए?'
                  : 'Which plot do you want to diagnose?';
        await conversationSessionService.patchContext(captured.farmerId, {
          diagnosis: { imageCount: 0 },
          pendingCropSelection: false,
        });
        await conversationSessionService.clearActivePlot(captured.farmerId);
        if (assessmentPlots.length >= 2) {
          await this.sendPlotPicker(msg.phone, captured.farmerId, lang, send);
        } else {
          await cropSelectionService.sendCropPicker({
            farmerId: captured.farmerId,
            phone: msg.phone,
            language: lang,
            send,
            body: diagnoseBody,
          });
          await conversationSessionService.setState(captured.farmerId, 'crop_select');
        }
        break;
      }
      case 'menu.track_order': {
        await orderWhatsappService.handleInboundAction({
          phone: msg.phone,
          farmerId: captured.farmerId,
          language: lang,
          action: 'order.track',
        });
        await conversationSessionService.setState(captured.farmerId, 'main_menu');
        break;
      }
      case 'menu.weather': {
        const weather = await weatherAlertsService.formatForFarmer(captured.farmerId, lang);
        await send.text(msg.phone, weather);
        await conversationSessionService.setState(captured.farmerId, 'main_menu');
        break;
      }
      case 'menu.prices': {
        const prices = await dailyPricesService.formatForFarmer(captured.farmerId, lang);
        await send.text(msg.phone, prices);
        await conversationSessionService.setState(captured.farmerId, 'main_menu');
        break;
      }
      case 'menu.soil': {
        const soil = soilFlowService.soilMenuList(lang);
        if (send.list) {
          await send.list({ phone: msg.phone, ...soil });
        } else {
          await send.text(msg.phone, soil.body);
        }
        await conversationSessionService.setState(captured.farmerId, 'soil_flow');
        break;
      }
      case 'menu.expert':
        await send.text(msg.phone, await callbackFlowService.createCallback(captured.farmerId, lang));
        await conversationSessionService.setState(captured.farmerId, 'main_menu');
        break;
      default:
        await this.showMainMenu(msg.phone, lang, send);
    }
  },

  async handleSoilAction(
    msg: InboundMessage,
    captured: ScenarioCapture,
    lang: AdvisoryLanguage,
    action: string,
    send: ScenarioSenders
  ): Promise<void> {
    switch (action) {
      case 'soil.address':
        await send.text(msg.phone, soilFlowService.addressReply(lang));
        break;
      case 'soil.testing':
        await send.text(msg.phone, await soilFlowService.requestSoilTesting(captured.farmerId, lang));
        break;
      case 'soil.upload':
        await send.text(
          msg.phone,
          lang === 'ml'
            ? 'മണ്ണ് റിപ്പോർട്ടിന്റെ PDF അല്ലെങ്കിൽ ഫോട്ടോ അയയ്ക്കുക.'
            : 'Please send your soil report PDF or photo.'
        );
        break;
      case 'soil.enter_lab': {
        const activePlot = await multiPlotService.getActivePlotId(captured.farmerId);
        await conversationSessionService.patchContext(captured.farmerId, {
          soilLabStep: 'macro',
          soilLabDraft: {},
          soilLabBlockId: activePlot ?? undefined,
        });
        await conversationSessionService.setState(captured.farmerId, 'soil_lab_entry');
        await send.text(msg.phone, soilFlowService.macroEntryPrompt(lang));
        return;
      }
      case 'soil.expert':
        await send.text(msg.phone, await callbackFlowService.createCallback(captured.farmerId, lang, 'Soil expert'));
        break;
      default:
        break;
    }
    await conversationSessionService.setState(captured.farmerId, 'soil_flow');
  },

  async handleSoilLabEntry(
    msg: InboundMessage,
    captured: ScenarioCapture,
    lang: AdvisoryLanguage,
    text: string,
    send: ScenarioSenders
  ): Promise<boolean> {
    const ctx = await conversationSessionService.getContext(captured.farmerId);
    const step = ctx.soilLabStep ?? 'macro';

    if (step === 'macro') {
      const draft = soilFlowService.parseMacroInput(text);
      if (!draft) {
        await send.text(msg.phone, soilFlowService.invalidValuesReply(lang, 'macro'));
        return true;
      }
      await conversationSessionService.patchContext(captured.farmerId, {
        soilLabStep: 'micro',
        soilLabDraft: soilFlowService.draftToContext(draft),
      });
      await send.text(msg.phone, soilFlowService.microEntryPrompt(lang));
      return true;
    }

    if (step === 'micro') {
      const draft = soilFlowService.draftFromContext(ctx as Record<string, unknown>);
      const withMicro = soilFlowService.parseMicroInput(draft, text);
      if (!withMicro) {
        await send.text(msg.phone, soilFlowService.invalidValuesReply(lang, 'micro'));
        return true;
      }
      await conversationSessionService.patchContext(captured.farmerId, {
        soilLabStep: 'soil_type',
        soilLabDraft: soilFlowService.draftToContext(withMicro),
      });
      await send.text(msg.phone, soilFlowService.soilTypeEntryPrompt(lang));
      return true;
    }

    if (step === 'soil_type') {
      const soilType = soilFlowService.parseSoilTypeInput(text);
      if (!soilType) {
        await send.text(msg.phone, soilFlowService.soilTypeEntryPrompt(lang));
        return true;
      }
      const draft = soilFlowService.draftFromContext(ctx as Record<string, unknown>);
      draft.soilType = soilType;
      if (!soilFlowService.metricsHasValues(draft)) {
        await send.text(msg.phone, soilFlowService.invalidValuesReply(lang, 'micro'));
        return true;
      }

      const summary = await soilFlowService.saveLabMetrics(captured.farmerId, draft, {
        blockId: ctx.soilLabBlockId,
        uploadedBy: 'whatsapp',
      });
      await nutrientSoilGateService.markSoilReportReceived(captured.farmerId);
      await conversationSessionService.patchContext(captured.farmerId, {
        soilLabStep: undefined,
        soilLabDraft: undefined,
        soilLabBlockId: undefined,
      });
      await conversationSessionService.setState(captured.farmerId, 'main_menu');
      await send.text(msg.phone, soilFlowService.savedLabReply(lang, summary));

      const delivered = await nutrientSoilGateService.deliverPending({
        farmerId: captured.farmerId,
        phone: msg.phone,
        language: lang,
        sendText: (phone, body) => send.text(phone, body),
      });
      if (delivered?.delivered && delivered.summary) {
        await send.text(msg.phone, delivered.summary);
      }
      return true;
    }

    return false;
  },

  async handleWaterVolume(
    msg: InboundMessage,
    captured: ScenarioCapture,
    lang: AdvisoryLanguage,
    text: string,
    send: ScenarioSenders
  ): Promise<boolean> {
    if (text === 'action.callback') {
      await send.text(msg.phone, await callbackFlowService.createCallback(captured.farmerId, lang));
      return true;
    }

    const liters = diagnosisFlowService.parseWaterLiters(text);
    if (liters == null) {
      if (text === 'water.custom') {
        await send.text(
          msg.phone,
          lang === 'ml'
            ? 'എത്ര ലിറ്റർ വെള്ളം? ഉദാ: 300L'
            : 'How many liters? Example: 300L'
        );
        return true;
      }
      return false;
    }

    const reply = await diagnosisFlowService.formatQuantityReply(captured.farmerId, lang, liters);
    await send.text(msg.phone, reply);
    await conversationSessionService.setState(captured.farmerId, 'main_menu');
    return true;
  },

  async afterDiagnosis(params: {
    phone: string;
    farmerId: string;
    lang: AdvisoryLanguage;
    sessionId: string;
    advisory: import('../../ai/types.js').StructuredAdvisory;
    summary: string;
    send: ScenarioSenders;
    hasProductRecommendations?: boolean;
    skipNutrientSoilAsk?: boolean;
  }): Promise<void> {
    await diagnosisFlowService.storeDiagnosisResult(
      params.farmerId,
      params.sessionId,
      params.advisory,
      params.summary
    );

    if (params.advisory.confidence < 0.55 || params.advisory.escalationRecommended) {
      await params.send.text(params.phone, diagnosisFlowService.lowConfidenceReply(params.lang));
      if (params.send.buttons) {
        await params.send.buttons({
          phone: params.phone,
          body: 'Choose:',
          buttons: [
            { id: 'action.upload', title: 'Upload Photos' },
            { id: 'action.callback', title: 'Callback' },
          ],
        });
      }
      return;
    }

    if (
      /\b(root|nematode|rhizome|വേര|வேர்|ಬೇರು|जड़)\b/i.test(params.advisory.probableIssue) ||
      params.advisory.stressAnalysis?.some((s) => /root|nematode/i.test(s))
    ) {
      await params.send.text(params.phone, diagnosisFlowService.rootPhotosReply(params.lang));
      await conversationSessionService.setState(params.farmerId, 'root_photos_requested');
      return;
    }

    if (
      !params.skipNutrientSoilAsk &&
      suggestsNutrientDeficiency(params.advisory) &&
      !(await soilFlowService.hasSoilReport(params.farmerId))
    ) {
      await this.askSoilReportConfirmation(params.phone, params.farmerId, params.lang, params.send);
      return;
    }

    const ctx = await conversationSessionService.getContext(params.farmerId);
    if ((ctx.diagnosis?.dosageItems?.length ?? 0) > 0) {
      const list = diagnosisFlowService.waterVolumeList(params.lang);
      if (params.send.list) {
        await params.send.list({ phone: params.phone, ...list });
      } else {
        await params.send.text(params.phone, list.body);
      }
    }

    const hasProducts =
      params.hasProductRecommendations ??
      ((params.advisory.dosageGuidance?.length ?? 0) > 0 ||
        (params.advisory.recommendedProductTags?.length ?? 0) > 0);

    await cultivationLoggingService
      .onAdvisoryCompleted({
        farmerId: params.farmerId,
        sessionId: params.sessionId,
        language: params.lang,
        hasProductRecommendations: hasProducts,
      })
      .catch((err) => logger.error({ err }, 'Cultivation follow-up schedule failed'));

    await recommendationFollowUpService
      .bootstrapFromDiagnosisSession(params.sessionId, params.farmerId)
      .catch((err) => logger.error({ err }, 'Recommendation follow-up bootstrap failed'));

    if (params.send.buttons) {
      const disagreeLabel =
        params.lang === 'ml' ? 'AI തെറ്റാണ്' : params.lang === 'hi' ? 'AI गलत है' : 'AI is wrong';
      await params.send.buttons({
        phone: params.phone,
        body:
          params.lang === 'ml'
            ? 'ഈ നിർണയം ശരിയല്ലെങ്കിൽ, നിങ്ങളുടെ അനുഭവം പങ്കിടുക:'
            : 'If this diagnosis is not right, share your field experience:',
        buttons: [{ id: 'feedback.disagree', title: disagreeLabel.slice(0, 20) }],
      });
    }
  },
};
