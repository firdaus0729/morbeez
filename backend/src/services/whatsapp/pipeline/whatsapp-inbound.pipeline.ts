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
import {
  fetchCompactFarmerContext,
  formatCompactHistory,
} from './advisory-context.service.js';
import { validateAdvisorySafety } from './safety-validation.service.js';
import { extractInboundMedia } from './media-extract.service.js';
import { shopifyLinksService } from '../../shopify/shopify-links.service.js';
import { whatsappConversationalService } from '../whatsapp-conversational.service.js';
import { farmerService } from '../../farmer/farmer.service.js';
import { conversationSessionService } from '../conversation-session.service.js';
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
};

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
  if (t === 'english' || t === 'en') return 'en';
  if (t === 'malayalam' || t === 'ml') return 'ml';
  if (t === 'tamil' || t === 'ta') return 'ta';
  if (t === 'kannada' || t === 'kn') return 'kn';
  if (t === 'hindi' || t === 'hi') return 'hi';
  return null;
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

function mainMenuCopy(language: AdvisoryLanguage): {
  welcome: string;
  buttonText: string;
  rows: Array<{ id: string; title: string; description?: string }>;
} {
  const map: Record<AdvisoryLanguage, { welcome: string; buttonText: string; rows: any[] }> = {
    en: {
      welcome: 'Welcome to Morbeez Agriculture Assistant 🌱\n\nHow can we help you today?',
      buttonText: 'Choose',
      rows: [
        { id: 'menu.diagnosis', title: 'Disease Diagnosis', description: 'Send crop photo / symptoms' },
        { id: 'menu.weather', title: 'Weather Alerts', description: 'Rain / humidity / spray suitability' },
        { id: 'menu.prices', title: 'Daily Prices', description: 'Today’s crop prices' },
        { id: 'menu.soil', title: 'Soil Testing', description: 'Sample + report help' },
        { id: 'menu.expert', title: 'Talk to Expert', description: 'Callback from our team' },
      ],
    },
    ml: {
      welcome: 'മോർബീസ് അഗ്രികൾച്ചർ അസിസ്റ്റന്റിലേക്ക് സ്വാഗതം 🌱\n\nഇന്ന് നിങ്ങളെ എങ്ങനെ സഹായിക്കാം?',
      buttonText: 'തിരഞ്ഞെടുക്കുക',
      rows: [
        { id: 'menu.diagnosis', title: 'Disease Diagnosis', description: 'വിളയുടെ ഫോട്ടോ / ലക്ഷണങ്ങൾ' },
        { id: 'menu.weather', title: 'Weather Alerts', description: 'മഴ / ഈർപ്പം / സ്പ്രേ' },
        { id: 'menu.prices', title: 'Daily Prices', description: 'ഇന്നത്തെ വില' },
        { id: 'menu.soil', title: 'Soil Testing', description: 'സാമ്പിൾ / റിപ്പോർട്ട്' },
        { id: 'menu.expert', title: 'Talk to Expert', description: 'ടീം കോൾബാക്ക്' },
      ],
    },
    ta: {
      welcome: 'Morbeez Agriculture Assistant-க்கு வரவேற்கிறோம் 🌱\n\nஇன்று எப்படி உதவலாம்?',
      buttonText: 'தேர்ந்தெடுக்கவும்',
      rows: [
        { id: 'menu.diagnosis', title: 'Disease Diagnosis', description: 'பயிர் புகைப்படம் / அறிகுறிகள்' },
        { id: 'menu.weather', title: 'Weather Alerts', description: 'மழை / ஈரப்பதம் / ஸ்ப்ரே' },
        { id: 'menu.prices', title: 'Daily Prices', description: 'இன்றைய விலை' },
        { id: 'menu.soil', title: 'Soil Testing', description: 'மண் பரிசோதனை' },
        { id: 'menu.expert', title: 'Talk to Expert', description: 'எங்கள் குழு அழைக்கும்' },
      ],
    },
    kn: {
      welcome: 'Morbeez Agriculture Assistantಗೆ ಸ್ವಾಗತ 🌱\n\nಇಂದು ಹೇಗೆ ಸಹಾಯ ಮಾಡಲಿ?',
      buttonText: 'ಆಯ್ಕೆಮಾಡಿ',
      rows: [
        { id: 'menu.diagnosis', title: 'Disease Diagnosis', description: 'ಬೆಳೆ ಫೋಟೋ / ಲಕ್ಷಣಗಳು' },
        { id: 'menu.weather', title: 'Weather Alerts', description: 'ಮಳೆ / ತೇವಾಂಶ / ಸ್ಪ್ರೇ' },
        { id: 'menu.prices', title: 'Daily Prices', description: 'ಇಂದಿನ ಬೆಲೆ' },
        { id: 'menu.soil', title: 'Soil Testing', description: 'ಮಣ್ಣಿನ ಪರೀಕ್ಷೆ' },
        { id: 'menu.expert', title: 'Talk to Expert', description: 'ನಮ್ಮ ತಂಡ ಕರೆಮಾಡುತ್ತದೆ' },
      ],
    },
    hi: {
      welcome: 'Morbeez Agriculture Assistant में आपका स्वागत है 🌱\n\nआज हम कैसे मदद कर सकते हैं?',
      buttonText: 'चुनें',
      rows: [
        { id: 'menu.diagnosis', title: 'Disease Diagnosis', description: 'फसल फोटो / लक्षण' },
        { id: 'menu.weather', title: 'Weather Alerts', description: 'बारिश / नमी / स्प्रे' },
        { id: 'menu.prices', title: 'Daily Prices', description: 'आज के दाम' },
        { id: 'menu.soil', title: 'Soil Testing', description: 'मिट्टी जांच' },
        { id: 'menu.expert', title: 'Talk to Expert', description: 'हमारी टीम कॉल करेगी' },
      ],
    },
  };
  return map[language] ?? map.en;
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

export const whatsappInboundPipeline = {
  async process(
    msg: InboundMessage,
    send: Senders,
    hooks?: {
      sendWelcomeTemplate?: (phone: string, farmerId: string, profileName?: string) => Promise<boolean>;
    }
  ): Promise<void> {
    const detected = detectLanguageFromText(msg.text);
    const language = normalizeLanguage(detected, null);

    const captured = await leadCaptureService.captureAndIdentify(msg, language);

    // Conversation state + ownership (human takeover / pause AI)
    const session = await conversationSessionService.ensureWhatsAppSession(captured.farmerId);
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

    if (hooks?.sendWelcomeTemplate) {
      await hooks.sendWelcomeTemplate(msg.phone, captured.farmerId, msg.profileName).catch(() => {});
    }

    // Scenario 1: New user greeting → language selection (5 languages)
    if (!session.preferred_language && msg.text && isGreeting(msg.text)) {
      const copy = languageSelectCopy();
      if (send.list) {
        await send.list({
          phone: msg.phone,
          body: copy.body,
          buttonText: copy.buttonText,
          sections: [{ title: 'Languages', rows: copy.rows }],
        });
      } else {
        await send.text(msg.phone, `${copy.body}\n\nReply with: English / Malayalam / Tamil / Kannada / Hindi`);
      }
      await conversationSessionService.setState(captured.farmerId, 'language_select', {
        last_menu_at: new Date().toISOString(),
      });
      return;
    }

    // Handle language selection via typed text or interactive id
    if (!session.preferred_language && msg.text) {
      const selected = msg.text.startsWith('lang.')
        ? (msg.text.replace('lang.', '') as AdvisoryLanguage)
        : languageFromSelection(msg.text);
      if (selected && ['en', 'ml', 'ta', 'kn', 'hi'].includes(selected)) {
        await conversationSessionService.setLanguage(captured.farmerId, selected);
        const menu = mainMenuCopy(selected);
        if (send.list) {
          await send.list({
            phone: msg.phone,
            body: menu.welcome,
            buttonText: menu.buttonText,
            sections: [{ title: 'Menu', rows: menu.rows }],
          });
        } else {
          await send.text(
            msg.phone,
            `${menu.welcome}\n\nReply with: Disease Diagnosis / Weather Alerts / Daily Prices / Soil Testing / Talk to Expert`
          );
        }
        return;
      }
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

    const faqHit = msg.text ? await faqCacheService.match(msg.text, captured.language) : null;
    if (faqHit && !hasCropMedia) {
      await send.text(msg.phone, faqHit);
      return;
    }

    if (VOICE_TYPES.has(msg.msgType)) {
      await this.processVoice(msg, captured, send.text);
    } else if (CROP_MEDIA_TYPES.has(msg.msgType)) {
      await this.processImage(msg, captured, send.text);
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
    sendText: (phone: string, text: string) => Promise<void>
  ): Promise<void> {
    const media = await extractInboundMedia({
      channel: msg.channel,
      msgType: msg.msgType,
      messageObject: msg.messageObject,
    });

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
      sendText,
    });
  },

  async processImage(
    msg: InboundMessage,
    captured: { farmerId: string; phone: string; language: AdvisoryLanguage; isPremium: boolean },
    sendText: (phone: string, text: string) => Promise<void>
  ): Promise<void> {
    const usage = await aiUsageControlService.checkAndConsume({
      farmerId: captured.farmerId,
      kind: 'image',
      isPremium: captured.isPremium,
    });
    if (!usage.allowed) {
      await sendText(captured.phone, aiUsageControlService.usageLimitMessage(captured.language, usage.reason));
      return;
    }

    const media = await extractInboundMedia({
      channel: msg.channel,
      msgType: msg.msgType,
      messageObject: msg.messageObject,
    });

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
      await sendText(captured.phone, imageQualityMessage(captured.language, 'duplicate'));
      return;
    }

    await recordImageHash(captured.farmerId, quality.contentHash);

    await this.runDiagnosis({
      farmerId: captured.farmerId,
      phone: captured.phone,
      language: captured.language,
      imageBase64: media.imageBase64,
      imageMimeType: media.imageMimeType,
      symptomsText: msg.text || undefined,
      sendText,
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

    const agriDiagnosisIntent =
      /crop|doctor|disease|pest|leaf|yellow|wilt|spot|fungus|symptom|ginger|pepper|വിള|രോഗ|കീട|பயிர|ಬೆಳೆ|फसल/i.test(
        msg.text
      ) && msg.text.trim().length >= 25;

    if (env.ENABLE_AI_CROP_DOCTOR && agriDiagnosisIntent) {
      const usage = await aiUsageControlService.checkAndConsume({
        farmerId: captured.farmerId,
        kind: 'text',
        isPremium: captured.isPremium,
      });
      if (!usage.allowed) {
        await sendText(captured.phone, aiUsageControlService.usageLimitMessage(captured.language, usage.reason));
        return;
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

    if (whatsappConversationalService.isEnabled()) {
      const usage = await aiUsageControlService.checkAndConsume({
        farmerId: captured.farmerId,
        kind: 'text',
        isPremium: captured.isPremium,
      });
      if (!usage.allowed) {
        await sendText(captured.phone, aiUsageControlService.usageLimitMessage(captured.language, usage.reason));
        return;
      }

      const reply = await whatsappConversationalService.generateReply({
        userMessage: msg.text,
        language: captured.language,
        farmerName: msg.profileName,
      });
      await this.sendAndLog(captured.farmerId, captured.phone, reply, sendText);
      return;
    }

    await sendText(
      captured.phone,
      captured.language === 'ml'
        ? 'നമസ്കാരം! മോർബീസ് ക്രോപ്പ് ഡോക്ടർ. വിളയുടെ ഫോട്ടോ അയയ്ക്കുക അല്ലെങ്കിൽ പ്രശ്നം വിവരിക്കുക.'
        : 'Hello from Morbeez Crop Doctor! Send a crop photo or describe your crop problem (crop name + symptoms).'
    );
  },

  async sendAndLog(
    farmerId: string,
    phone: string,
    text: string,
    sendText: (phone: string, text: string) => Promise<void>
  ): Promise<void> {
    await sendText(phone, text);
    await farmerService.logInteraction(farmerId, 'whatsapp', 'outbound', text.slice(0, 500)).catch(() => {});
  },

  async runDiagnosis(params: {
    farmerId: string;
    phone: string;
    language: AdvisoryLanguage;
    symptomsText?: string;
    voiceTranscript?: string;
    imageBase64?: string;
    imageMimeType?: string;
    sendText: (phone: string, text: string) => Promise<void>;
  }): Promise<void> {
    try {
      const ctx = await fetchCompactFarmerContext(params.farmerId);
      const compactHistory = formatCompactHistory(ctx);

      const result = await cropDoctorService.diagnose({
        farmerId: params.farmerId,
        cropType: ctx.cropType,
        cropStage: ctx.cropStage,
        language: params.language,
        symptomsText: params.symptomsText,
        voiceTranscript: params.voiceTranscript,
        imageBase64: params.imageBase64,
        imageMimeType: params.imageMimeType,
        channel: 'whatsapp',
        compactHistory,
      });

      const safety = validateAdvisorySafety(result.advisory, params.language);
      if (!safety.safe) {
        await params.sendText(params.phone, safety.farmerMessage);
        return;
      }

      let reply = localizedSummary(result.advisory, params.language);
      reply += '\n\n— Morbeez AI-assisted advisory (not a guaranteed diagnosis).';

      if (result.escalated) {
        reply += '\n\nOur agronomist team will review your case shortly.';
      }

      const productBlock = shopifyLinksService.formatRecommendationsForWhatsApp(
        result.productRecommendations,
        params.language
      );
      if (productBlock) reply += `\n\n${productBlock}`;

      await this.sendAndLog(params.farmerId, params.phone, reply.slice(0, 4000), params.sendText);
    } catch (err) {
      logger.error({ err, farmerId: params.farmerId }, 'WhatsApp pipeline diagnosis failed');
      await params.sendText(
        params.phone,
        params.language === 'ml'
          ? 'ക്ഷമിക്കണം, ഇപ്പോൾ വിശകലനം ചെയ്യാൻ കഴിഞ്ഞില്ല. വീണ്ടും ശ്രമിക്കുക അല്ലെങ്കിൽ "call" ടൈപ്പ് ചെയ്യുക.'
          : 'Sorry, we could not analyze your message right now. Try again or type "call" for help.'
      );
    }
  },
};
