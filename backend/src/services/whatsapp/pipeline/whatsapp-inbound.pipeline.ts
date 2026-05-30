import { env } from '../../../config/env.js';
import { eventBus } from '../../../events/bus.js';
import { supabase } from '../../../lib/supabase.js';
import { logger } from '../../../lib/logger.js';
import { cropDoctorService } from '../../ai/crop-doctor.service.js';
import { transcriptionService } from '../../ai/transcription.service.js';
import type { AdvisoryLanguage, StructuredAdvisory } from '../../ai/types.js';
import { leadCaptureService } from './lead-capture.service.js';
import {
  detectLanguageFromText,
  normalizeLanguage,
} from './language-detection.service.js';
import { validateAgricultureIntent, guardRejectionMessage } from './agriculture-guard.service.js';
import {
  assessImageBuffer,
  isDuplicateImage,
  recordImageHash,
  imageQualityMessage,
} from './image-quality.service.js';
import { aiUsageControlService } from './ai-usage-control.service.js';
import { faqCacheService } from './faq-cache.service.js';
import { farmerMemoryService } from './farmer-memory.service.js';
import { tryAgronomyReply } from './agronomy-reply.service.js';
import {
  isConversationFollowUp,
  shouldUseConversationalContinuation,
} from './conversation-continuation.service.js';
import { shouldSkipFaqForMessage } from './faq-cache.service.js';
import { knowledgeFallbackService } from './knowledge-fallback.service.js';
import {
  replyAttributionService,
  type MorbeezReplyModule,
  type ReplyAttributionMeta,
} from './reply-attribution.service.js';
import { farmerReplyPolishService } from './farmer-reply-polish.service.js';
import { validateAdvisorySafety } from './safety-validation.service.js';
import { extractInboundMedia } from './media-extract.service.js';
import { shopifyLinksService } from '../../shopify/shopify-links.service.js';
import { whatsappConversationalService } from '../whatsapp-conversational.service.js';
import { farmerService } from '../../farmer/farmer.service.js';
import { advisoryImageStorageService } from '../../core/advisory-image-storage.service.js';
import { conversationSessionService } from '../conversation-session.service.js';
import { whatsappScenarioRouter } from '../scenarios/whatsapp-scenario-router.service.js';
import {
  nutrientSoilGateService,
  soilGatePreface,
} from '../scenarios/nutrient-soil-gate.service.js';
import { cropSelectionService } from '../scenarios/crop-selection.service.js';
import { farmerPurgeService } from '../../farmer/farmer-purge.service.js';
import { orderWhatsappService } from '../orders/order-whatsapp.service.js';
import { onboardingFlowService, pincodePrompt } from '../scenarios/onboarding-flow.service.js';
import { sendReplyButtonMenu } from '../whatsapp-interactive-menu.service.js';
import { diagnosisFlowService } from '../scenarios/diagnosis-flow.service.js';
import { multiPlotService } from '../scenarios/multi-plot.service.js';
import { aiReuseService } from '../../ai/ai-reuse.service.js';
import { cropDetectionService } from './crop-detection.service.js';
import { contextPackService } from './context-pack.service.js';
import { policyEngineService } from '../../ai/policy-engine.service.js';
import { createTelecallerTask } from './telecaller-tasks.service.js';
import { accuracyMetricsService } from '../../ai/accuracy-metrics.service.js';
import { inputClassifierService } from './input-classifier.service.js';
import { imageInputClassifierService } from './image-input-classifier.service.js';
import {
  compatibilityLookupService,
  parseProductPairFromText,
} from './compatibility-lookup.service.js';
import { isExplicitAgronomyQuestion } from './agriculture-free-text.service.js';
import { responseComposerService } from './response-composer.service.js';
import { assessmentPlaybookService } from '../scenarios/assessment-playbook.service.js';
import { roiFlowService } from '../roi/roi-flow.service.js';
import type { InboundMessage } from './types.js';

const CROP_MEDIA_TYPES = new Set(['image', 'image_message', 'document']);
const VOICE_TYPES = new Set(['audio', 'voice', 'audio_message']);
type Senders = {
  text: (phone: string, text: string) => Promise<void>;
  list?: (params: {
    phone: string;
    header?: string;
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

async function askCropSelection(
  send: Senders,
  phone: string,
  language: AdvisoryLanguage,
  farmerId: string
): Promise<void> {
  await cropSelectionService.sendCropPicker({
    farmerId,
    phone,
    language,
    send,
    body:
      language === 'ml'
        ? 'വിള കണ്ടെത്താനായില്ല. ദയവായി വിള തിരഞ്ഞെടുക്കുക.'
        : 'AI could not detect crop clearly. Please select crop.',
  });
}

function localizedSummary(advisory: StructuredAdvisory, language: AdvisoryLanguage): string {
  if (language === 'ml' && advisory.farmerSummaryMl) return advisory.farmerSummaryMl;
  return advisory.farmerSummaryEn;
}

function isGreeting(text: string): boolean {
  const t = text.trim().toLowerCase();
  if (!t) return false;
  return /^(hi|hello|hai|hey|hii|hlo|yo|👋)$/i.test(t) || t.includes('👋');
}

function languageFromSelection(text: string): AdvisoryLanguage | null {
  const t = text.trim().toLowerCase();
  // "hi" is a common greeting — never treat it as Hindi (use lang.hi button or "hindi" text).
  if (isGreeting(t)) return null;
  if (t === 'english' || t === 'en') return 'en';
  if (t === 'malayalam' || t === 'ml') return 'ml';
  if (t === 'tamil' || t === 'ta') return 'ta';
  if (t === 'kannada' || t === 'kn') return 'kn';
  if (t === 'hindi') return 'hi';
  return null;
}

async function tryAssessmentPlaybook(params: {
  farmerId: string;
  phone: string;
  language: AdvisoryLanguage;
  text?: string;
  hasCropMedia: boolean;
  imageBase64?: string;
  imageMimeType?: string;
  sendText: (phone: string, text: string) => Promise<void>;
}): Promise<boolean> {
  const textResult = inputClassifierService.classifyText(params.text, {
    hasCropMedia: params.hasCropMedia,
  });

  let visionMerged = textResult;
  if (params.hasCropMedia && params.imageBase64) {
    const vision = await imageInputClassifierService.classifyImage({
      imageBase64: params.imageBase64,
      imageMimeType: params.imageMimeType ?? 'image/jpeg',
      caption: params.text,
    });
    if (vision) {
      if (vision.photoQuality === 'blurry' || vision.photoQuality === 'too_dark') {
        await params.sendText(
          params.phone,
          imageQualityMessage(
            params.language,
            vision.photoQuality === 'too_dark' ? 'too_dark' : 'blurry'
          )
        );
        return true;
      }
      visionMerged = inputClassifierService.mergeWithVision(textResult, {
        category: imageInputClassifierService.toAgricultureCategory(vision),
        confidence: vision.confidence,
        photoQuality: vision.photoQuality,
      });
    }
  }

  const classification = visionMerged;

  if (classification.category === 'compatibility' && params.text) {
    const pair = parseProductPairFromText(params.text);
    if (pair) {
      const lookup = await compatibilityLookupService.lookup(pair.productA, pair.productB);
      if (lookup.found) {
        await params.sendText(
          params.phone,
          compatibilityLookupService.formatFarmerReply(lookup, params.language, pair)
        );
        if (lookup.compatible === false) {
          await assessmentPlaybookService.applyEscalation(
            params.farmerId,
            'compatibility',
            params.text.slice(0, 300)
          );
        }
        await conversationSessionService.setState(params.farmerId, 'playbook_pending');
        return true;
      }
      return false;
    }
    return false;
  }

  if (!inputClassifierService.shouldUsePlaybook(classification)) {
    return false;
  }

  const playbook = assessmentPlaybookService.resolve(classification, params.language, {
    hasCropMedia: params.hasCropMedia,
  });
  if (playbook.action === 'continue_diagnosis') {
    return false;
  }

  const playbookMemory = await farmerMemoryService.build(params.farmerId);
  const playbookOutbound = await replyAttributionService.deliverAttributedReply({
    farmerId: params.farmerId,
    phone: params.phone,
    language: params.language,
    body: playbook.message,
    module: 'playbook',
    meta: { cropType: playbookMemory.cropType },
    sendText: params.sendText,
  });
  await farmerService
    .logInteraction(params.farmerId, 'whatsapp', 'outbound', playbookOutbound.slice(0, 500))
    .catch(() => {});
  if (playbook.escalate) {
    await assessmentPlaybookService.applyEscalation(
      params.farmerId,
      classification.category,
      params.text?.slice(0, 300)
    );
  }
  await conversationSessionService.setState(params.farmerId, 'playbook_pending');
  await conversationSessionService.patchContext(params.farmerId, {
    lastPlaybookCategory: classification.category,
  });
  return true;
}

function validationQuestion(issue: string, language: AdvisoryLanguage): string {
  const lower = issue.toLowerCase();
  if (/thrip|silver|streak|scrap/.test(lower)) {
    return language === 'ml'
      ? 'സ്ഥിരീകരിക്കാൻ: ഇലയുടെ അടിയിൽ ചെറിയ കീടങ്ങളോ കറുത്ത മലമുണ്ടോ?'
      : 'To confirm: do you see tiny insects or black dots under the leaves?';
  }
  if (/root|rot|nematode|rhizome/.test(lower)) {
    return language === 'ml'
      ? 'സ്ഥിരീകരിക്കാൻ: വേരുകൾ മൃദുവായിട്ടുണ്ടോ, ദുർഗന്ധമുണ്ടോ?'
      : 'To confirm: are roots soft and is there any foul smell?';
  }
  if (/yellow|chlorosis|deficien/.test(lower)) {
    return language === 'ml'
      ? 'സ്ഥിരീകരിക്കാൻ: ഇലമഞ്ഞപ്പ് താഴെ നിന്ന് മുകളിലേക്ക് പടരുന്നുണ്ടോ?'
      : 'To confirm: is yellowing spreading from lower leaves upward?';
  }
  return language === 'ml'
    ? 'സ്ഥിരീകരിക്കാൻ: പ്രശ്നം എത്ര വേഗത്തിൽ പടരുന്നു?'
    : 'To confirm: how fast is this issue spreading in the field?';
}

function languageSelectCopy(): {
  body: string;
  buttonText: string;
  rows: Array<{ id: string; title: string; description?: string }>;
} {
  return {
    body: 'Welcome to Morbeez Agriculture Assistant.\n\nPlease select your language.',
    buttonText: 'Language',
    rows: [
      { id: 'lang.en', title: 'English' },
      { id: 'lang.ml', title: 'Malayalam' },
      { id: 'lang.ta', title: 'Tamil' },
      { id: 'lang.kn', title: 'Kannada' },
      { id: 'lang.hi', title: 'Hindi' },
    ],
  };
}

async function sendKnowledgeFallbackOrLimit(params: {
  farmerId: string;
  phone: string;
  language: AdvisoryLanguage;
  text: string;
  sendText: (phone: string, text: string) => Promise<void>;
  limitMessage: string;
  followUp?: boolean;
}): Promise<boolean> {
  const memory = await farmerMemoryService.build(params.farmerId, {
    symptomsText: params.text,
  });
  const kb = await knowledgeFallbackService.tryReplyWithModule({
    farmerId: params.farmerId,
    text: params.text,
    language: params.language,
    memory,
    followUp: params.followUp,
  });
  if (kb) {
    const outbound = await replyAttributionService.deliverAttributedReply({
      farmerId: params.farmerId,
      phone: params.phone,
      language: params.language,
      body: kb.text,
      module: kb.module,
      meta: kb.meta,
      sendText: params.sendText,
    });
    await farmerService
      .logInteraction(params.farmerId, 'whatsapp', 'outbound', outbound.slice(0, 500))
      .catch(() => {});
    return true;
  }
  await params.sendText(params.phone, params.limitMessage);
  return false;
}

async function classifyCommercialLead(farmerId: string, text: string): Promise<void> {
  const lower = text.toLowerCase();
  let intent: string | null = null;
  if (/quote|quotation|price|rate|വില/i.test(lower)) intent = 'quotation';
  else if (/call|callback|ഫോൺ/i.test(lower)) intent = 'callback';
  else if (/help|support|problem/i.test(lower)) intent = 'support';
  if (!intent) return;

  await supabase.from('leads').insert({
    farmer_id: farmerId,
    source: 'whatsapp',
    intent,
    status: 'new',
    stage: 'interested',
    notes: text.slice(0, 500),
  });

  if (intent === 'quotation') {
    await eventBus.publish('quotation.requested', { farmerId, text }, 'whatsapp');
  }
}

function isFarmerResetCommand(text: string): boolean {
  const t = text.trim().toLowerCase();
  return (
    /^(delete my data|erase my data|reset account|reset my account|delete account|forget me)$/i.test(t) ||
    /^(ഡാറ്റ ഇല്ലാതാക്കുക|എന്റെ ഡാറ്റ മായ്ക്കുക|അക്കൗണ്ട് റീസെറ്റ്)$/i.test(t) ||
    /^(मेरा डेटा हटाएं|खाता रीसेट)$/i.test(t)
  );
}

export const whatsappInboundPipeline = {
  async process(
    msg: InboundMessage,
    send: Senders,
    _hooks?: {
      sendWelcomeTemplate?: (phone: string, farmerId: string, profileName?: string) => Promise<boolean>;
    }
  ): Promise<void> {
    const detected = detectLanguageFromText(msg.text);
    const language = normalizeLanguage(detected, null);

    if (msg.text?.trim() && isFarmerResetCommand(msg.text)) {
      const phone = orderWhatsappService.normalizePhone(msg.phone);
      await farmerPurgeService.purgeByPhone(phone);
      const ack =
        language === 'ml'
          ? 'നിങ്ങളുടെ മോർബീസ് ഡാറ്റ പൂർണ്ണമായും ഇല്ലാതാക്കി. പുതിയ കർഷകനായി രജിസ്റ്റർ ചെയ്യാൻ *Hi* അയയ്ക്കുക.'
          : 'Your Morbeez data has been fully removed. Send *Hi* anytime to register as a new farmer.';
      await send.text(msg.phone, ack);
      return;
    }

    const captured = await leadCaptureService.captureAndIdentify(msg, language);

    // Conversation state + ownership (human takeover / pause AI)
    let session = await conversationSessionService.ensureWhatsAppSession(captured.farmerId);
    if (!captured.hadHistoricalLead) {
      const now = new Date().toISOString();
      await supabase
        .from('conversation_sessions')
        .update({
          preferred_language: null,
          state: 'language_select',
          conversation_owner: 'ai',
          ai_paused: false,
          active_plot_id: null,
          active_block_id: null,
          context: { onboardingComplete: false },
          updated_at: now,
        })
        .eq('farmer_id', captured.farmerId)
        .eq('channel', 'whatsapp');
      session = {
        ...session,
        preferred_language: null,
        state: 'language_select',
        context: { onboardingComplete: false },
      };
    }
    if (await conversationSessionService.shouldPauseAi(captured.farmerId)) {
      logger.info({ farmerId: captured.farmerId }, 'AI paused for WhatsApp conversation');
      return;
    }

    await supabase.from('interaction_logs').insert({
      farmer_id: captured.farmerId,
      channel: 'whatsapp',
      direction: 'inbound',
      message_type: msg.msgType,
      content: msg.text || msg.msgType,
      external_message_id: msg.messageId,
      raw_payload: msg.rawPayload,
      purge_after: new Date(Date.now() + 3 * 24 * 60 * 60 * 1000).toISOString(),
    });

    // Recover farmers who said "hi" before fix (was misread as Hindi → skipped language menu).
    const ctxEarly = await conversationSessionService.getContext(captured.farmerId);
    const onboardingDoneEarly = await onboardingFlowService.isComplete(captured.farmerId);
    if (
      !onboardingDoneEarly &&
      session.preferred_language &&
      msg.text &&
      isGreeting(msg.text) &&
      (ctxEarly.onboardingStep === 'pincode' ||
        (ctxEarly.onboardingStep === 'acreage' && !ctxEarly.onboardingAcreageBucket))
    ) {
      const now = new Date().toISOString();
      await supabase
        .from('conversation_sessions')
        .update({
          preferred_language: null,
          state: 'language_select',
          updated_at: now,
        })
        .eq('farmer_id', captured.farmerId)
        .eq('channel', 'whatsapp');
      session = { ...session, preferred_language: null, state: 'language_select' };
    }

    // Step 1 — language selection (required before anything else for new farmers)
    if (!session.preferred_language) {
      if (msg.text?.startsWith('lang.')) {
        const code = msg.text.replace('lang.', '') as AdvisoryLanguage;
        if (['en', 'ml', 'ta', 'kn', 'hi'].includes(code)) {
          await conversationSessionService.setLanguageForOnboarding(captured.farmerId, code);
          await whatsappScenarioRouter.startMinimalOnboarding(
            msg.phone,
            captured.farmerId,
            code,
            send
          );
          return;
        }
      }

      const typedLang = msg.text ? languageFromSelection(msg.text) : null;
      if (typedLang) {
        const selected = typedLang;
        if (selected && ['en', 'ml', 'ta', 'kn', 'hi'].includes(selected)) {
          await conversationSessionService.setLanguageForOnboarding(captured.farmerId, selected);
          await whatsappScenarioRouter.startMinimalOnboarding(
            msg.phone,
            captured.farmerId,
            selected,
            send
          );
          return;
        }
      }

      const copy = languageSelectCopy();
      if (send.list) {
        await send.list({
          phone: msg.phone,
          body: copy.body,
          buttonText: copy.buttonText,
          sections: [{ title: 'Languages', rows: copy.rows }],
        });
      } else if (send.buttons) {
        await sendReplyButtonMenu({
          to: msg.phone,
          body: copy.body,
          options: copy.rows.map((r) => ({ id: r.id, title: r.title })),
          continuationBody: 'Please select your language (continued):',
          sendButtons: (p) =>
            send.buttons!({
              phone: p.to,
              body: p.body,
              buttons: p.buttons,
            }),
        });
      } else {
        await send.text(msg.phone, `${copy.body}\n\nReply with: English / Malayalam / Tamil / Kannada / Hindi`);
      }
      await conversationSessionService.setState(captured.farmerId, 'language_select', {
        last_menu_at: new Date().toISOString(),
      });
      return;
    }

    const onboardingDone = await onboardingFlowService.isComplete(captured.farmerId);
    if (!onboardingDone) {
      const routeOnboarding = await whatsappScenarioRouter.tryRoute(msg, captured, session, send);
      if (routeOnboarding.handled) {
        await eventBus.publish(
          'whatsapp.message.received',
          { phone: msg.phone, farmerId: captured.farmerId, text: msg.text, messageType: msg.msgType },
          'whatsapp'
        );
        return;
      }
    }

    const activeLang = (session.preferred_language ?? captured.language) as AdvisoryLanguage;
    captured.language = activeLang;

    if (session.preferred_language && onboardingDone && msg.text && isGreeting(msg.text)) {
      await whatsappScenarioRouter.showReturningFarmerWelcome(msg, captured, activeLang, send);
      await eventBus.publish(
        'whatsapp.message.received',
        { phone: msg.phone, farmerId: captured.farmerId, text: msg.text, messageType: msg.msgType },
        'whatsapp'
      );
      return;
    }

    const routeResult = await whatsappScenarioRouter.tryRoute(
      msg,
      captured,
      session,
      send
    );

    if (routeResult.handled && 'runDiagnosis' in routeResult && routeResult.runDiagnosis) {
      if (routeResult.welcomePrefix) {
        await send.text(msg.phone, routeResult.welcomePrefix);
      }
      await this.processImage(msg, { ...captured, language: activeLang }, send.text, send);
      await eventBus.publish(
        'whatsapp.message.received',
        { phone: msg.phone, farmerId: captured.farmerId, text: msg.text, messageType: msg.msgType },
        'whatsapp'
      );
      return;
    }

    if (routeResult.handled) {
      await eventBus.publish(
        'whatsapp.message.received',
        { phone: msg.phone, farmerId: captured.farmerId, text: msg.text, messageType: msg.msgType },
        'whatsapp'
      );
      return;
    }

    if (onboardingDone) {
      const eveningRoi = await roiFlowService.tryEveningPromptOnInbound({
        farmerId: captured.farmerId,
        phone: msg.phone,
        language: activeLang,
        sessionState: session.state,
        routeHandled: routeResult.handled,
        text: msg.text,
        send,
      });
      if (eveningRoi) {
        await eventBus.publish(
          'whatsapp.message.received',
          { phone: msg.phone, farmerId: captured.farmerId, text: msg.text, messageType: msg.msgType },
          'whatsapp'
        );
        return;
      }
    }

    if (!onboardingDone) {
      const ctxOnboard = await conversationSessionService.getContext(captured.farmerId);
      const stepPrompt = onboardingFlowService.currentStepPrompt(ctxOnboard.onboardingStep, activeLang);
      await send.text(msg.phone, stepPrompt);
      if (ctxOnboard.onboardingStep === 'crop' || ctxOnboard.onboardingStep === 'custom_crop') {
        await cropSelectionService.sendCropPicker({
          farmerId: captured.farmerId,
          phone: msg.phone,
          language: activeLang,
          send,
        });
      } else if (ctxOnboard.onboardingStep === 'pincode') {
        await send.text(msg.phone, pincodePrompt(activeLang));
      } else if (ctxOnboard.onboardingStep === 'acreage') {
        await whatsappScenarioRouter.sendAcreageOnboardingStep(msg.phone, activeLang, send);
      }
      await eventBus.publish(
        'whatsapp.message.received',
        { phone: msg.phone, farmerId: captured.farmerId, text: msg.text, messageType: msg.msgType },
        'whatsapp'
      );
      return;
    }

    if (!env.ENABLE_AI_CROP_DOCTOR) {
      if (msg.text) await classifyCommercialLead(captured.farmerId, msg.text);
      await this.replyToText(msg, captured, send.text);
      await eventBus.publish(
        'whatsapp.message.received',
        { phone: msg.phone, farmerId: captured.farmerId, text: msg.text, messageType: msg.msgType },
        'whatsapp'
      );
      return;
    }

    const hasCropMedia =
      CROP_MEDIA_TYPES.has(msg.msgType) || VOICE_TYPES.has(msg.msgType);

    const guard = validateAgricultureIntent({ text: msg.text, hasCropMedia });
    if (!guard.allowed) {
      await send.text(msg.phone, guardRejectionMessage(captured.language));
      return;
    }

    const faqHit =
      msg.text && !shouldSkipFaqForMessage(msg.text)
        ? await faqCacheService.match(msg.text, captured.language)
        : null;
    if (faqHit && !hasCropMedia) {
      await send.text(msg.phone, faqHit);
      return;
    }

    if (VOICE_TYPES.has(msg.msgType)) {
      await this.processVoice(msg, captured, send.text, send);
    } else if (CROP_MEDIA_TYPES.has(msg.msgType)) {
      await this.processImage(msg, captured, send.text, send);
    } else if (msg.text) {
      await this.processText(msg, captured, send.text);
    }

    await eventBus.publish(
      'whatsapp.message.received',
      { phone: msg.phone, farmerId: captured.farmerId, text: msg.text, messageType: msg.msgType },
      'whatsapp'
    );
  },

  async processVoice(
    msg: InboundMessage,
    captured: { farmerId: string; phone: string; language: AdvisoryLanguage; isPremium: boolean },
    sendText: (phone: string, text: string) => Promise<void>,
    send?: Senders
  ): Promise<void> {
    let media: Awaited<ReturnType<typeof extractInboundMedia>>;
    try {
      media = await extractInboundMedia({
        channel: msg.channel,
        msgType: msg.msgType,
        messageObject: msg.messageObject,
      });
    } catch (err) {
      logger.error({ err, farmerId: captured.farmerId, msgType: msg.msgType }, 'WhatsApp media extract failed');
      await sendText(
        captured.phone,
        captured.language === 'ml'
          ? 'വോയ്സ് നോട്ട് ലോഡ് ചെയ്യാൻ കഴിഞ്ഞില്ല. വീണ്ടും അയയ്ക്കുക.'
          : 'We could not load your voice note. Please try again.'
      );
      return;
    }

    if (!media.audioBuffer) {
      await sendText(
        captured.phone,
        captured.language === 'ml'
          ? 'വോയ്സ് നോട്ട് ലഭിച്ചില്ല. വീണ്ടും അയയ്ക്കുക.'
          : 'Could not receive voice note. Please try again.'
      );
      return;
    }

    const usage = await aiUsageControlService.checkAndConsume({
      farmerId: captured.farmerId,
      kind: 'voice',
      isPremium: captured.isPremium,
      voiceDurationSec: media.audioDurationSec ?? 30,
    });
    if (!usage.allowed) {
      await sendText(captured.phone, aiUsageControlService.usageLimitMessage(captured.language, usage.reason));
      return;
    }

    let transcript = await transcriptionService.transcribeVoice(
      media.audioBuffer,
      media.audioMimeType ?? 'audio/ogg',
      captured.language
    );

    const fromVoice = detectLanguageFromText(transcript);
    const language = normalizeLanguage(fromVoice, captured.language);

    await this.runDiagnosis({
      farmerId: captured.farmerId,
      phone: captured.phone,
      language,
      voiceTranscript: transcript,
      channel: 'whatsapp',
      sendText,
      send,
    });
  },

  async processImage(
    msg: InboundMessage,
    captured: { farmerId: string; phone: string; language: AdvisoryLanguage; isPremium: boolean },
    sendText: (phone: string, text: string) => Promise<void>,
    senders?: Senders
  ): Promise<void> {
    const plots = await multiPlotService.listPlots(captured.farmerId);
    const memoryPeek = await farmerMemoryService.build(captured.farmerId, {
      symptomsText: msg.text || undefined,
    });
    const willReuse = await aiReuseService.peekMatch({
      farmerId: captured.farmerId,
      cropType: memoryPeek.cropType,
      symptomsText: msg.text || undefined,
      activePlotId: memoryPeek.activePlotId,
      compactHistory: farmerMemoryService.formatCompactHistory(memoryPeek),
    });

    if (!willReuse) {
      const usage = await aiUsageControlService.checkAndConsume({
        farmerId: captured.farmerId,
        kind: 'image',
        isPremium: captured.isPremium,
      });
      if (!usage.allowed) {
        await sendText(captured.phone, aiUsageControlService.usageLimitMessage(captured.language, usage.reason));
        return;
      }
    }

    let media: Awaited<ReturnType<typeof extractInboundMedia>>;
    try {
      media = await extractInboundMedia({
        channel: msg.channel,
        msgType: msg.msgType,
        messageObject: msg.messageObject,
      });
    } catch (err) {
      logger.error({ err, farmerId: captured.farmerId, msgType: msg.msgType }, 'WhatsApp media extract failed');
      await sendText(
        captured.phone,
        captured.language === 'ml'
          ? 'ചിത്രം ലോഡ് ചെയ്യാൻ കഴിഞ്ഞില്ല. ദയവായി വീണ്ടും അയയ്ക്കുക.'
          : 'We could not load your photo. Please send the image again in a moment.'
      );
      return;
    }

    if (!media.imageBase64) {
      await sendText(
        captured.phone,
        imageQualityMessage(captured.language, 'unsupported')
      );
      return;
    }

    const buffer = Buffer.from(media.imageBase64, 'base64');
    const quality = assessImageBuffer(buffer, media.imageMimeType);
    if (!quality.ok) {
      await sendText(captured.phone, imageQualityMessage(captured.language, quality.reason));
      return;
    }

    if (await isDuplicateImage(captured.farmerId, quality.contentHash)) {
      const ctx = await conversationSessionService.getContext(captured.farmerId);
      await sendText(
        captured.phone,
        diagnosisFlowService.duplicateImageReply(captured.language, ctx.diagnosis?.lastAdvisorySummary)
      );
      return;
    }

    await recordImageHash(captured.farmerId, quality.contentHash);

    if (
      await tryAssessmentPlaybook({
        farmerId: captured.farmerId,
        phone: captured.phone,
        language: captured.language,
        text: msg.text || undefined,
        hasCropMedia: true,
        imageBase64: media.imageBase64,
        imageMimeType: media.imageMimeType ?? 'image/jpeg',
        sendText,
      })
    ) {
      return;
    }

    const memory = await farmerMemoryService.build(captured.farmerId, {
      symptomsText: msg.text || undefined,
    });
    const farmerAlreadySelectedCrop = memory.knownCropLocked;

    if (plots.length <= 1 && !farmerAlreadySelectedCrop && senders) {
      const detected = await cropDetectionService.detectFromImage({
        imageBase64: media.imageBase64,
        imageMimeType: media.imageMimeType ?? 'image/jpeg',
        caption: msg.text || undefined,
      });
      if (detected.crop && detected.crop !== 'other' && detected.confidence >= 0.62) {
        await multiPlotService.setPrimaryCropType(captured.farmerId, detected.crop);
      } else {
        await askCropSelection(senders, captured.phone, captured.language, captured.farmerId);
        await conversationSessionService.patchContext(captured.farmerId, { pendingCropSelection: true });
        await conversationSessionService.setState(captured.farmerId, 'crop_select');
        return;
      }
    }

    await this.runDiagnosis({
      farmerId: captured.farmerId,
      phone: captured.phone,
      language: captured.language,
      imageBase64: media.imageBase64,
      imageMimeType: media.imageMimeType,
      symptomsText: msg.text || undefined,
      channel: 'whatsapp',
      sendText,
      send: senders,
    });
  },

  async processText(
    msg: InboundMessage,
    captured: { farmerId: string; phone: string; language: AdvisoryLanguage; isPremium: boolean },
    sendText: (phone: string, text: string) => Promise<void>
  ): Promise<void> {
    await this.replyToText(msg, captured, sendText);
  },

  /** OpenAI chat for greetings/help; full Crop Doctor when symptoms are detailed. */
  async replyToText(
    msg: InboundMessage,
    captured: { farmerId: string; phone: string; language: AdvisoryLanguage; isPremium: boolean },
    sendText: (phone: string, text: string) => Promise<void>
  ): Promise<void> {
    if (!msg.text?.trim()) {
      await sendText(
        captured.phone,
        captured.language === 'ml'
          ? 'ദയവായി ടെക്സ്റ്റ് അയയ്ക്കുക, വിളയുടെ ഫോട്ടോ, അല്ലെങ്കിൽ വോയ്സ് നോട്ട്.'
          : 'Please send a text message, crop photo, or voice note.'
      );
      return;
    }

    await classifyCommercialLead(captured.farmerId, msg.text);

    if (
      shouldUseConversationalContinuation(msg.text) ||
      (isConversationFollowUp(msg.text) && (await farmerMemoryService.hasRecentThread(captured.farmerId)))
    ) {
      const memory = await farmerMemoryService.build(captured.farmerId, {
        symptomsText: msg.text,
      });
      if (whatsappConversationalService.isEnabled()) {
        const usage = await aiUsageControlService.checkAndConsume({
          farmerId: captured.farmerId,
          kind: 'text',
          isPremium: captured.isPremium,
        });
        if (!usage.allowed) {
          await sendKnowledgeFallbackOrLimit({
            farmerId: captured.farmerId,
            phone: captured.phone,
            language: captured.language,
            text: msg.text,
            sendText,
            limitMessage: aiUsageControlService.usageLimitMessage(captured.language, usage.reason),
            followUp: true,
          });
          return;
        }
        const reply = await whatsappConversationalService.generateReply({
          farmerId: captured.farmerId,
          userMessage: msg.text,
          language: captured.language,
          farmerName: msg.profileName,
          memory,
          followUp: true,
        });
        await this.sendAndLog(captured.farmerId, captured.phone, reply, sendText, {
          module: 'follow_up_memory',
          language: captured.language,
          meta: { cropType: memory.cropType },
        });
        return;
      }
    }

    if (
      await tryAssessmentPlaybook({
        farmerId: captured.farmerId,
        phone: captured.phone,
        language: captured.language,
        text: msg.text,
        hasCropMedia: false,
        sendText,
      })
    ) {
      return;
    }

    const agriDiagnosisIntent =
      /crop|doctor|disease|pest|leaf|yellow|wilt|spot|fungus|symptom|ginger|pepper|വിള|രോഗ|കീട|பயிர|ಬೆಳೆ|फसल/i.test(
        msg.text
      ) && msg.text.trim().length >= 25;

    const generalAgronomyQuestion = isExplicitAgronomyQuestion(msg.text);

    if (generalAgronomyQuestion || parseProductPairFromText(msg.text)) {
      const agronomyHandled = await tryAgronomyReply({
        farmerId: captured.farmerId,
        phone: captured.phone,
        language: captured.language,
        text: msg.text,
        sendText,
        farmerName: msg.profileName,
        isPremium: captured.isPremium,
      });
      if (agronomyHandled) return;
    }

    if (env.ENABLE_AI_CROP_DOCTOR && agriDiagnosisIntent) {
      const memory = await farmerMemoryService.build(captured.farmerId, {
        symptomsText: msg.text,
      });
      const willReuse = await aiReuseService.peekMatch({
        farmerId: captured.farmerId,
        cropType: memory.cropType,
        symptomsText: msg.text,
        activePlotId: memory.activePlotId,
        compactHistory: farmerMemoryService.formatCompactHistory(memory),
      });

      if (!willReuse) {
        const usage = await aiUsageControlService.checkAndConsume({
          farmerId: captured.farmerId,
          kind: 'text',
          isPremium: captured.isPremium,
        });
        if (!usage.allowed) {
          await sendKnowledgeFallbackOrLimit({
            farmerId: captured.farmerId,
            phone: captured.phone,
            language: captured.language,
            text: msg.text,
            sendText,
            limitMessage: aiUsageControlService.usageLimitMessage(captured.language, usage.reason),
          });
          return;
        }
      }
      await this.runDiagnosis({
        farmerId: captured.farmerId,
        phone: captured.phone,
        language: captured.language,
        symptomsText: msg.text,
        sendText,
      });
      return;
    }

    const memory = await farmerMemoryService.build(captured.farmerId, {
      symptomsText: msg.text,
    });

    if (whatsappConversationalService.isEnabled() && msg.text.trim().length >= 8) {
      const usage = await aiUsageControlService.checkAndConsume({
        farmerId: captured.farmerId,
        kind: 'text',
        isPremium: captured.isPremium,
      });
      if (!usage.allowed) {
        await sendKnowledgeFallbackOrLimit({
          farmerId: captured.farmerId,
          phone: captured.phone,
          language: captured.language,
          text: msg.text,
          sendText,
          limitMessage: aiUsageControlService.usageLimitMessage(captured.language, usage.reason),
        });
        return;
      }

      const reply = await whatsappConversationalService.generateReply({
        farmerId: captured.farmerId,
        userMessage: msg.text,
        language: captured.language,
        farmerName: msg.profileName,
        memory,
      });
      await this.sendAndLog(captured.farmerId, captured.phone, reply, sendText, {
        module: 'conversational_openai',
        language: captured.language,
        meta: { cropType: memory.cropType },
      });
      return;
    }

    await sendText(
      captured.phone,
      farmerMemoryService.memoryAwareFallback(memory, captured.language)
    );
  },

  async sendAndLog(
    farmerId: string,
    phone: string,
    text: string,
    sendText: (phone: string, text: string) => Promise<void>,
    attribution?: {
      module: MorbeezReplyModule;
      language: AdvisoryLanguage;
      meta?: ReplyAttributionMeta;
    }
  ): Promise<void> {
    let outbound = text;
    if (attribution) {
      outbound = await replyAttributionService.deliverAttributedReply({
        farmerId,
        phone,
        language: attribution.language,
        body: text,
        module: attribution.module,
        meta: attribution.meta,
        sendText,
      });
    } else {
      await sendText(phone, text);
    }
    await farmerService
      .logInteraction(farmerId, 'whatsapp', 'outbound', outbound.slice(0, 500))
      .catch(() => {});
  },

  async runDiagnosis(params: {
    farmerId: string;
    phone: string;
    language: AdvisoryLanguage;
    symptomsText?: string;
    voiceTranscript?: string;
    imageBase64?: string;
    imageMimeType?: string;
    channel?: 'whatsapp' | 'api' | 'web';
    sendText: (phone: string, text: string) => Promise<void>;
    send?: Senders;
  }): Promise<void> {
    try {
      const sessCtx = await conversationSessionService.getContext(params.farmerId);
      const symptomsText =
        params.symptomsText?.trim() ||
        sessCtx.pendingSymptomsText ||
        undefined;
      const memory = await farmerMemoryService.build(params.farmerId, { symptomsText });
      const contextPack = await contextPackService.build(params.farmerId);

      let imageStoragePath: string | undefined;
      if (params.imageBase64) {
        const stored = await advisoryImageStorageService.uploadFromBase64(
          params.farmerId,
          params.imageBase64,
          params.imageMimeType ?? 'image/jpeg'
        );
        if (stored) imageStoragePath = stored;
      }

      const result = await cropDoctorService.diagnose({
        farmerId: params.farmerId,
        cropType: memory.cropType,
        cropStage: memory.cropStage,
        language: params.language,
        symptomsText,
        voiceTranscript: params.voiceTranscript,
        imageBase64: params.imageBase64,
        imageMimeType: params.imageMimeType,
        imageStoragePath,
        channel: params.channel ?? 'whatsapp',
        compactHistory: farmerMemoryService.formatCompactHistory(memory),
        contextPack,
      });
      const hasImage = Boolean(params.imageBase64);
      const assessment = policyEngineService.evaluate(result.advisory, {
        ...contextPack,
        hasImage,
      });

      const safety = validateAdvisorySafety(result.advisory, params.language);
      if (!safety.safe) {
        await params.sendText(params.phone, safety.farmerMessage);
        return;
      }

      await accuracyMetricsService.logDiagnosisEvent({
        sessionId: result.sessionId,
        farmerId: params.farmerId,
        cropType: memory.cropType,
        confidence: result.advisory.confidence,
        escalated: Boolean(result.escalated),
        source: params.channel ?? 'whatsapp',
        weatherRisk: assessment.weatherRiskBand,
      });

      await createTelecallerTask({
        farmerId: params.farmerId,
        title: 'Symptom Confirmation Required',
        notes: `Probable issue: ${result.advisory.probableIssue}; confidence ${Math.round(result.advisory.confidence * 100)}%; crop ${memory.cropType}`,
        priority: assessment.escalationPriority === 'urgent' ? 'urgent' : 'normal',
      });

      if (assessment.shouldRequestMoreEvidence) {
        await createTelecallerTask({
          farmerId: params.farmerId,
          title: 'Symptom confirmation required',
          notes: `Confidence ${Math.round(result.advisory.confidence * 100)}%, Crop ${memory.cropType}, WeatherRisk ${assessment.weatherRiskBand}`,
          priority: assessment.escalationPriority === 'urgent' ? 'urgent' : 'high',
        });
        await params.sendText(
          params.phone,
          params.language === 'ml'
            ? 'ലക്ഷണങ്ങൾ കൂടുതൽ സ്ഥിരീകരിക്കണം. ദയവായി കൂടുതൽ വ്യക്തമായ ഇല/വേരിന്റെ ചിത്രങ്ങൾ അയയ്ക്കുക. ടീം നിങ്ങളെ ബന്ധപ്പെടും.'
            : 'Symptoms need further confirmation. Please send clearer leaf/root images. Our team will contact you.'
        );
        await conversationSessionService.setState(params.farmerId, 'root_photos_requested');
        return;
      }

      if (hasImage && assessment.confidenceBand === 'low' && !localizedSummary(result.advisory, params.language)) {
        await params.sendText(
          params.phone,
          params.language === 'ml'
            ? 'ചിത്രം വ്യക്തമല്ല. ദയവായി ബാധിത ഇലയുടെ അടുത്ത ഫോട്ടോ വീണ്ടും അയയ്ക്കുക.'
            : 'The photo was not clear enough. Please send a closer photo of the affected leaves.'
        );
        await conversationSessionService.setState(params.farmerId, 'diagnosis_awaiting_photos');
        return;
      }

      if (
        params.channel === 'whatsapp' &&
        (await nutrientSoilGateService.shouldGateBeforeFertilizerAdvice(
          params.farmerId,
          result.advisory
        ))
      ) {
        await nutrientSoilGateService.storePending(params.farmerId, {
          sessionId: result.sessionId,
          advisory: result.advisory,
        });
        await params.sendText(params.phone, soilGatePreface(params.language));
        if (params.send) {
          await whatsappScenarioRouter.askSoilReportConfirmation(
            params.phone,
            params.farmerId,
            params.language,
            params.send
          );
        } else {
          await params.sendText(
            params.phone,
            params.language === 'ml'
              ? 'മണ്ണ് പരിശോധന റിപ്പോർട്ട് ഉണ്ടോ? Yes / No'
              : 'Do you have a soil test report? Reply Yes or No.'
          );
          await conversationSessionService.setState(params.farmerId, 'nutrient_soil_confirm');
        }
        return;
      }

      if (assessment.needsValidationQuestion) {
        await createTelecallerTask({
          farmerId: params.farmerId,
          title: 'Telecaller symptom validation',
          notes: `AI confidence in medium band. Issue: ${result.advisory.probableIssue}`,
          priority: 'normal',
        });
        await params.sendText(
          params.phone,
          responseComposerService.compose({
            body: localizedSummary(result.advisory, params.language),
            validationQuestion: validationQuestion(result.advisory.probableIssue, params.language),
            footer: responseComposerService.advisoryDisclaimer(params.language),
          })
        );
        await conversationSessionService.setState(params.farmerId, 'diagnosis');
        return;
      }

      const plotPrefix = sessCtx.activePlotLabel ? `📍 ${sessCtx.activePlotLabel}\n\n` : '';
      const reuseNote = result.reused
        ? params.language === 'ml'
          ? '(സമാനമായ മുൻ കേസിൽ നിന്നുള്ള ശുപാർശ)'
          : '(Similar successful case in your region)'
        : undefined;
      const escalateNote = result.escalated
        ? 'Our agronomist team will review your case shortly.'
        : undefined;
      const safetyNote = assessment.safetyNotes.length
        ? `⚠️ ${assessment.safetyNotes.join(' ')}`
        : undefined;

      let body = localizedSummary(result.advisory, params.language);
      if (
        farmerReplyPolishService.isEnabled() &&
        body?.trim() &&
        params.channel === 'whatsapp'
      ) {
        body = await farmerReplyPolishService.polishDiagnosisSummary({
          advisory: result.advisory,
          language: params.language,
          memory,
          extraLines: [reuseNote, escalateNote, safetyNote].filter(Boolean) as string[],
        });
      } else {
        if (result.reused && reuseNote) body += `\n\n${reuseNote}`;
        if (result.escalated && escalateNote) body += `\n\n${escalateNote}`;
        if (safetyNote) body += `\n\n${safetyNote}`;
      }

      body = plotPrefix + body;

      const productBlock = shopifyLinksService.formatRecommendationsForWhatsApp(
        result.productRecommendations,
        params.language
      );
      if (productBlock) body += `\n\n${productBlock}`;

      const validationQ = assessment.needsValidationQuestion
        ? validationQuestion(result.advisory.probableIssue, params.language)
        : responseComposerService.extractValidationQuestion(body);

      const reply = responseComposerService.compose({
        body,
        validationQuestion: validationQ,
        footer: responseComposerService.advisoryDisclaimer(params.language),
      });

      if (sessCtx.pendingSymptomsText) {
        await conversationSessionService.patchContext(params.farmerId, {
          pendingSymptomsText: undefined,
        });
      }

      await this.sendAndLog(params.farmerId, params.phone, reply, params.sendText, {
        module: result.reused ? 'crop_doctor_reuse' : 'crop_doctor_openai',
        language: params.language,
        meta: {
          cropType: memory.cropType,
          issueLabel: result.advisory.probableIssue,
        },
      });

      if (params.channel === 'whatsapp' && params.send) {
        await whatsappScenarioRouter.afterDiagnosis({
          phone: params.phone,
          farmerId: params.farmerId,
          lang: params.language,
          sessionId: result.sessionId,
          advisory: result.advisory,
          summary: reply,
          send: params.send,
          hasProductRecommendations: (result.productRecommendations?.length ?? 0) > 0,
        });
      }
    } catch (err) {
      logger.error({ err, farmerId: params.farmerId }, 'WhatsApp pipeline diagnosis failed');
      const symptomText = params.symptomsText ?? params.voiceTranscript ?? '';
      const memory = await farmerMemoryService.build(params.farmerId, {
        symptomsText: symptomText || undefined,
      });
      const kb = await knowledgeFallbackService.tryReplyWithModule({
        farmerId: params.farmerId,
        text: symptomText || 'crop advisory',
        language: params.language,
        memory,
      });
      if (kb) {
        await this.sendAndLog(params.farmerId, params.phone, kb.text, params.sendText, {
          module: kb.module,
          language: params.language,
          meta: kb.meta,
        });
        return;
      }
      await params.sendText(
        params.phone,
        params.language === 'ml'
          ? 'ക്ഷമിക്കണം, ഇപ്പോൾ വിശകലനം ചെയ്യാൻ കഴിഞ്ഞില്ല. വീണ്ടും ശ്രമിക്കുക അല്ലെങ്കിൽ "call" ടൈപ്പ് ചെയ്യുക.'
          : 'Sorry, we could not analyze your message right now. Try again or type "call" for help.'
      );
    }
  },
};
