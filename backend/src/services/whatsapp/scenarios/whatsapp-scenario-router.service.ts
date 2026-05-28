import { supabase } from '../../../lib/supabase.js';
import { logger } from '../../../lib/logger.js';
import type { AdvisoryLanguage } from '../../ai/types.js';
import type { InboundMessage } from '../pipeline/types.js';
import {
  conversationSessionService,
  type ConversationSession,
} from '../conversation-session.service.js';
import { mainMenuCopy } from './whatsapp-menu.service.js';
import { t } from './whatsapp-flow-copy.js';
import { weatherAlertsService } from './weather-alerts.service.js';
import { dailyPricesService } from './daily-prices.service.js';
import { soilFlowService } from './soil-flow.service.js';
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

const CROP_MEDIA = new Set(['image', 'image_message', 'document']);
const MENU_IDS = new Set([
  'menu.diagnosis',
  'menu.track_order',
  'menu.weather',
  'menu.prices',
  'menu.soil',
  'menu.expert',
]);
const CROP_IDS = new Set(['crop.ginger', 'crop.banana', 'crop.cardamom', 'crop.pepper', 'crop.other']);
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

function isChangePlotCommand(text: string): boolean {
  return /^(change plot|switch plot|plot change|മറ്റ് പ്ലോട്ട്|ப்ளாட் மாற்று)$/i.test(text.trim());
}

function cropFromSelection(text: string): 'ginger' | 'banana' | 'cardamom' | 'pepper' | 'other' | null {
  const t = text.trim().toLowerCase();
  if (t.startsWith('crop.')) {
    const raw = t.slice(5);
    if (raw === 'ginger' || raw === 'banana' || raw === 'cardamom' || raw === 'pepper' || raw === 'other') {
      return raw;
    }
  }
  if (/\bginger|inchi|ഇഞ്ചി|अदरक\b/i.test(t)) return 'ginger';
  if (/\bbanana|vazha|വാഴ|केला\b/i.test(t)) return 'banana';
  if (/\bcardamom|elakka|ഏലക്ക|इलायची\b/i.test(t)) return 'cardamom';
  if (/\bpepper|kurumulaku|കുരുമുളക്|काली मिर्च\b/i.test(t)) return 'pepper';
  if (/\bother|others|മറ്റ്|अन्य\b/i.test(t)) return 'other';
  return null;
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
        ? 'കൂടുതൽ സ്ഥിരീകരണത്തിന് മണ്ണ് പരിശോധന റിപ്പോർട്ട് ഉണ്ടോ?'
        : 'For further confirmation, do you have a soil test report?';
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
    const copy =
      lang === 'ml'
        ? 'എത്ര ഏക്കർ കൃഷിയുണ്ട്?'
        : 'How many acres are under cultivation?';
    const options = [
      { id: 'acreage.0_1', title: '0-1 acre' },
      { id: 'acreage.2_5', title: '2-5 acre' },
      { id: 'acreage.5_plus', title: '5+ acre' },
    ];
    await conversationSessionService.patchContext(farmerId, {
      onboardingStep: 'acreage',
      onboardingAcreageBucket: undefined,
    });
    await conversationSessionService.setState(farmerId, 'onboarding_minimal');
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

    // Follow-up outcome capture (Step 8/9)
    if (text && /^(improved|better|partial|no improvement|worse|worsening)$/i.test(text)) {
      const ctx = await conversationSessionService.getContext(captured.farmerId);
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
      const ctx = await conversationSessionService.getContext(captured.farmerId);
      const plots = await multiPlotService.listPlots(captured.farmerId);
      const primary = plots.find((p) => p.is_primary) ?? plots[0];
      if (!primary) {
        await send.text(msg.phone, t('mainMenuHint', lang));
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
          onboardingStep: 'planting_date',
          onboardingAcreageBucket: bucket,
        });
        await send.text(
          msg.phone,
          lang === 'ml'
            ? 'നടീൽ തീയതി DDMMYYYY ഫോർമാറ്റിൽ അയക്കുക. (ഉദാ: 28052026)'
            : 'Send Date of planting in DDMMYYYY format. (Example: 28052026)'
        );
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
        await conversationSessionService.patchContext(captured.farmerId, {
          onboardingStep: undefined,
          onboardingAcreageBucket: undefined,
        });
        await conversationSessionService.setState(captured.farmerId, 'diagnosis_awaiting_photos');
        await send.text(
          msg.phone,
          lang === 'ml'
            ? 'നന്ദി. ഇപ്പോൾ രോഗനിർണയത്തിനായി ചിത്രം അയയ്ക്കുക.'
            : 'Thanks. Now send crop image for diagnosis.'
        );
        return { handled: true };
      }
    }

    if (session.state === 'nutrient_soil_confirm' || SOIL_CONFIRM_IDS.has(text)) {
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
      await this.showMainMenu(msg.phone, lang, send);
      await conversationSessionService.setState(captured.farmerId, 'main_menu');
      return { handled: true };
    }

    if (isChangePlotCommand(text)) {
      await conversationSessionService.clearActivePlot(captured.farmerId);
      await this.sendPlotPicker(msg.phone, captured.farmerId, lang, send);
      return { handled: true };
    }

    if (session.state === 'crop_select' || text.startsWith('crop.') || CROP_IDS.has(text)) {
      const selected = cropFromSelection(text);
      if (!selected) {
        await send.text(
          msg.phone,
          lang === 'ml'
            ? 'വിള തിരഞ്ഞെടുക്കുക: ഇഞ്ചി / വാഴ / ഏലക്ക / കുരുമുളക് / Other'
            : 'Please choose crop: Ginger / Banana / Cardamom / Pepper / Other'
        );
        return { handled: true };
      }
      await multiPlotService.setPrimaryCropType(captured.farmerId, selected);
      await conversationSessionService.patchContext(captured.farmerId, { pendingCropSelection: false });
      await conversationSessionService.clearActivePlot(captured.farmerId);
      await conversationSessionService.setState(captured.farmerId, 'diagnosis_awaiting_photos');
      await send.text(
        msg.phone,
        lang === 'ml'
          ? 'ശരി. വിള അപ്ഡേറ്റ് ചെയ്തു. വീണ്ടും ചിത്രം അയയ്ക്കുക.'
          : 'Got it. Crop updated. Please send the image again for diagnosis.'
      );
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

    // Main menu selection (list reply ids)
    if (text.startsWith('menu.') || MENU_IDS.has(text)) {
      await this.handleMenuSelection(msg, captured, lang, text, send);
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

    // PDF / document soil report (Scenario 14)
    if (msg.msgType === 'document' && session.state === 'soil_flow') {
      await send.text(msg.phone, soilFlowService.reportReceivedReply(lang));
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
            const requestedCrop = cropFromSelection(msg.text);
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
        const { imageCount, shouldRunDiagnosis } = await diagnosisFlowService.recordImageReceived(
          captured.farmerId
        );
        if (imageCount === 1) {
          await send.text(msg.phone, diagnosisFlowService.firstImagePrompt(lang));
          await conversationSessionService.setState(captured.farmerId, 'diagnosis_awaiting_photos');
          return { handled: true };
        }
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

    if (session.state === 'soil_flow' && text && !text.startsWith('soil.')) {
      await send.text(msg.phone, t('mainMenuHint', lang));
      return { handled: true };
    }

    return { handled: false };
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

  async handleMenuSelection(
    msg: InboundMessage,
    captured: ScenarioCapture,
    lang: AdvisoryLanguage,
    menuId: string,
    send: ScenarioSenders
  ): Promise<void> {
    switch (menuId) {
      case 'menu.diagnosis': {
        const plots = await multiPlotService.listPlots(captured.farmerId);
        await conversationSessionService.patchContext(captured.farmerId, {
          diagnosis: { imageCount: 0 },
        });
        if (plots.length >= 2) {
          await conversationSessionService.clearActivePlot(captured.farmerId);
          await this.sendPlotPicker(msg.phone, captured.farmerId, lang, send);
          break;
        }
        if (plots.length === 1) {
          await multiPlotService.setActivePlot(captured.farmerId, plots[0]);
        }
        await conversationSessionService.setState(captured.farmerId, 'diagnosis_awaiting_photos');
        await send.text(msg.phone, t('diagnosisPrompt', lang));
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
      case 'soil.expert':
        await send.text(msg.phone, await callbackFlowService.createCallback(captured.farmerId, lang, 'Soil expert'));
        break;
      default:
        break;
    }
    await conversationSessionService.setState(captured.farmerId, 'soil_flow');
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

    if ((params.advisory.nutrientDeficiency?.length ?? 0) > 0) {
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
  },
};
