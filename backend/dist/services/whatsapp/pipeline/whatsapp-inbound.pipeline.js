import { env } from '../../../config/env.js';
import { eventBus } from '../../../events/bus.js';
import { supabase } from '../../../lib/supabase.js';
import { logger } from '../../../lib/logger.js';
import { cropDoctorService } from '../../ai/crop-doctor.service.js';
import { transcriptionService } from '../../ai/transcription.service.js';
import { leadCaptureService } from './lead-capture.service.js';
import { detectLanguageFromText, normalizeLanguage, } from './language-detection.service.js';
import { validateAgricultureIntent, guardRejectionMessage } from './agriculture-guard.service.js';
import { assessImageBuffer, isDuplicateImage, recordImageHash, imageQualityMessage, } from './image-quality.service.js';
import { aiUsageControlService } from './ai-usage-control.service.js';
import { faqCacheService } from './faq-cache.service.js';
import { fetchCompactFarmerContext, formatCompactHistory, } from './advisory-context.service.js';
import { validateAdvisorySafety } from './safety-validation.service.js';
import { extractInboundMedia } from './media-extract.service.js';
import { shopifyLinksService } from '../../shopify/shopify-links.service.js';
import { whatsappConversationalService } from '../whatsapp-conversational.service.js';
import { farmerService } from '../../farmer/farmer.service.js';
import { conversationSessionService } from '../conversation-session.service.js';
import { whatsappScenarioRouter } from '../scenarios/whatsapp-scenario-router.service.js';
import { returnUserGreetingService } from '../scenarios/return-user-greeting.service.js';
import { cropSelectionService } from '../scenarios/crop-selection.service.js';
import { farmerPurgeService } from '../../farmer/farmer-purge.service.js';
import { orderWhatsappService } from '../orders/order-whatsapp.service.js';
import { sendReplyButtonMenu } from '../whatsapp-interactive-menu.service.js';
import { diagnosisFlowService } from '../scenarios/diagnosis-flow.service.js';
import { multiPlotService } from '../scenarios/multi-plot.service.js';
import { aiReuseService } from '../../ai/ai-reuse.service.js';
import { cropDetectionService } from './crop-detection.service.js';
import { contextPackService } from './context-pack.service.js';
import { policyEngineService } from '../../ai/policy-engine.service.js';
import { createTelecallerTask } from './telecaller-tasks.service.js';
import { accuracyMetricsService } from '../../ai/accuracy-metrics.service.js';
const CROP_MEDIA_TYPES = new Set(['image', 'image_message', 'document']);
const VOICE_TYPES = new Set(['audio', 'voice', 'audio_message']);
const CROP_HINTS = [
    { crop: 'ginger', terms: ['ginger', 'inchi', 'ഇഞ്ചി', 'इंजी', 'અદ્રક', 'अदरक', 'ഇഞ്ചി'] },
    { crop: 'pepper', terms: ['pepper', 'kurumulaku', 'കുരുമുളക്', 'मिर्च', 'ಕಾಳು ಮೆಣಸು'] },
    { crop: 'cardamom', terms: ['cardamom', 'elakka', 'ഏലക്ക', 'इलायची', 'ಏಲಕ್ಕಿ'] },
    { crop: 'banana', terms: ['banana', 'vazha', 'വാഴ', 'केला', 'ಬಾಳೆ'] },
    { crop: 'turmeric', terms: ['turmeric', 'manjal', 'മഞ്ഞൾ', 'हल्दी', 'ಅರಿಶಿನ'] },
    { crop: 'coconut', terms: ['coconut', 'thenga', 'തേങ്ങ', 'नारियल', 'ತೆಂಗು'] },
];
async function askCropSelection(send, phone, language, farmerId) {
    await cropSelectionService.sendCropPicker({
        farmerId,
        phone,
        language,
        send,
        body: language === 'ml'
            ? 'വിള കണ്ടെത്താനായില്ല. ദയവായി വിള തിരഞ്ഞെടുക്കുക.'
            : 'AI could not detect crop clearly. Please select crop.',
    });
}
function localizedSummary(advisory, language) {
    if (language === 'ml' && advisory.farmerSummaryMl)
        return advisory.farmerSummaryMl;
    return advisory.farmerSummaryEn;
}
function isGreeting(text) {
    const t = text.trim().toLowerCase();
    if (!t)
        return false;
    return /^(hi|hello|hai|hey|hii|hlo|yo|👋)$/i.test(t) || t.includes('👋');
}
function languageFromSelection(text) {
    const t = text.trim().toLowerCase();
    if (t === 'english' || t === 'en')
        return 'en';
    if (t === 'malayalam' || t === 'ml')
        return 'ml';
    if (t === 'tamil' || t === 'ta')
        return 'ta';
    if (t === 'kannada' || t === 'kn')
        return 'kn';
    if (t === 'hindi' || t === 'hi')
        return 'hi';
    return null;
}
function inferCropHint(text) {
    if (!text?.trim())
        return null;
    const lower = text.toLowerCase();
    for (const entry of CROP_HINTS) {
        if (entry.terms.some((term) => lower.includes(term.toLowerCase()))) {
            return entry.crop;
        }
    }
    return null;
}
async function resolveDiagnosisContext(params) {
    const initialActivePlotId = await multiPlotService.getActivePlotId(params.farmerId);
    const hintedCrop = inferCropHint(params.symptomsText);
    let resolvedActivePlotId = initialActivePlotId;
    if (hintedCrop) {
        const plots = await multiPlotService.listPlots(params.farmerId);
        const matched = plots.find((p) => p.crop_type.toLowerCase() === hintedCrop);
        if (matched) {
            resolvedActivePlotId = matched.id;
            await multiPlotService.setActivePlot(params.farmerId, matched);
        }
    }
    const ctx = await fetchCompactFarmerContext(params.farmerId, { activePlotId: resolvedActivePlotId });
    return {
        activePlotId: resolvedActivePlotId,
        cropType: hintedCrop ?? ctx.cropType,
        cropStage: ctx.cropStage,
        compactHistory: formatCompactHistory(ctx),
    };
}
async function fetchRecentConversationHistory(farmerId, limit = 8) {
    const { data } = await supabase
        .from('interaction_logs')
        .select('direction, content, created_at')
        .eq('farmer_id', farmerId)
        .eq('channel', 'whatsapp')
        .order('created_at', { ascending: false })
        .limit(limit);
    if (!data?.length)
        return [];
    return [...data]
        .reverse()
        .map((row) => `${row.direction === 'outbound' ? 'Assistant' : 'Farmer'}: ${String(row.content ?? '')}`)
        .filter((line) => line.trim().length > 0);
}
function validationQuestion(issue, language) {
    const lower = issue.toLowerCase();
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
function languageSelectCopy() {
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
async function classifyCommercialLead(farmerId, text) {
    const lower = text.toLowerCase();
    let intent = null;
    if (/quote|quotation|price|rate|വില/i.test(lower))
        intent = 'quotation';
    else if (/call|callback|ഫോൺ/i.test(lower))
        intent = 'callback';
    else if (/help|support|problem/i.test(lower))
        intent = 'support';
    if (!intent)
        return;
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
function isFarmerResetCommand(text) {
    const t = text.trim().toLowerCase();
    return (/^(delete my data|erase my data|reset account|reset my account|delete account|forget me)$/i.test(t) ||
        /^(ഡാറ്റ ഇല്ലാതാക്കുക|എന്റെ ഡാറ്റ മായ്ക്കുക|അക്കൗണ്ട് റീസെറ്റ്)$/i.test(t) ||
        /^(मेरा डेटा हटाएं|खाता रीसेट)$/i.test(t));
}
export const whatsappInboundPipeline = {
    async process(msg, send, hooks) {
        const detected = detectLanguageFromText(msg.text);
        const language = normalizeLanguage(detected, null);
        if (msg.text?.trim() && isFarmerResetCommand(msg.text)) {
            const phone = orderWhatsappService.normalizePhone(msg.phone);
            await farmerPurgeService.purgeByPhone(phone);
            const ack = language === 'ml'
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
                context: {},
                updated_at: now,
            })
                .eq('farmer_id', captured.farmerId)
                .eq('channel', 'whatsapp');
            session = { ...session, preferred_language: null, state: 'language_select', context: {} };
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
        if (hooks?.sendWelcomeTemplate) {
            await hooks.sendWelcomeTemplate(msg.phone, captured.farmerId, msg.profileName).catch(() => { });
        }
        // Scenario 1: New user greeting → language selection (5 reply buttons: 3 + 2)
        if (!session.preferred_language && msg.text && isGreeting(msg.text)) {
            const copy = languageSelectCopy();
            if (send.list || send.buttons) {
                if (send.list) {
                    await send.list({
                        phone: msg.phone,
                        body: copy.body,
                        buttonText: copy.buttonText,
                        sections: [{ title: 'Languages', rows: copy.rows }],
                    });
                }
                else if (send.buttons) {
                    await sendReplyButtonMenu({
                        to: msg.phone,
                        body: copy.body,
                        options: copy.rows.map((r) => ({ id: r.id, title: r.title })),
                        continuationBody: 'Please select your language (continued):',
                        sendButtons: (p) => send.buttons({
                            phone: p.to,
                            body: p.body,
                            buttons: p.buttons,
                        }),
                    });
                }
            }
            else {
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
                ? msg.text.replace('lang.', '')
                : languageFromSelection(msg.text);
            if (selected && ['en', 'ml', 'ta', 'kn', 'hi'].includes(selected)) {
                await conversationSessionService.setLanguage(captured.farmerId, selected);
                await whatsappScenarioRouter.startMinimalOnboarding(msg.phone, captured.farmerId, selected, send);
                return;
            }
        }
        const activeLang = (session.preferred_language ?? captured.language);
        captured.language = activeLang;
        if (session.preferred_language && msg.text && isGreeting(msg.text)) {
            const smartGreeting = await returnUserGreetingService.buildSmartGreeting(captured.farmerId, activeLang);
            if (smartGreeting) {
                await whatsappScenarioRouter.showMainMenu(msg.phone, activeLang, send, {
                    includeTrackOrder: smartGreeting.includeTrackOrder,
                    returningQuickActionsOnly: true,
                    welcomeOverride: `${smartGreeting.greeting}\n\n${smartGreeting.optionsIntro}`,
                });
                await conversationSessionService.setState(captured.farmerId, 'main_menu');
                await eventBus.publish('whatsapp.message.received', { phone: msg.phone, farmerId: captured.farmerId, text: msg.text, messageType: msg.msgType }, 'whatsapp');
                return;
            }
        }
        const routeResult = await whatsappScenarioRouter.tryRoute(msg, captured, session, send);
        if (routeResult.handled && 'runDiagnosis' in routeResult && routeResult.runDiagnosis) {
            if (routeResult.welcomePrefix) {
                await send.text(msg.phone, routeResult.welcomePrefix);
            }
            await this.processImage(msg, { ...captured, language: activeLang }, send.text, send);
            await eventBus.publish('whatsapp.message.received', { phone: msg.phone, farmerId: captured.farmerId, text: msg.text, messageType: msg.msgType }, 'whatsapp');
            return;
        }
        if (routeResult.handled) {
            await eventBus.publish('whatsapp.message.received', { phone: msg.phone, farmerId: captured.farmerId, text: msg.text, messageType: msg.msgType }, 'whatsapp');
            return;
        }
        if (!env.ENABLE_AI_CROP_DOCTOR) {
            if (msg.text)
                await classifyCommercialLead(captured.farmerId, msg.text);
            await this.replyToText(msg, captured, send.text);
            await eventBus.publish('whatsapp.message.received', { phone: msg.phone, farmerId: captured.farmerId, text: msg.text, messageType: msg.msgType }, 'whatsapp');
            return;
        }
        const hasCropMedia = CROP_MEDIA_TYPES.has(msg.msgType) || VOICE_TYPES.has(msg.msgType);
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
        }
        else if (CROP_MEDIA_TYPES.has(msg.msgType)) {
            await this.processImage(msg, captured, send.text, send);
        }
        else if (msg.text) {
            await this.processText(msg, captured, send.text);
        }
        await eventBus.publish('whatsapp.message.received', { phone: msg.phone, farmerId: captured.farmerId, text: msg.text, messageType: msg.msgType }, 'whatsapp');
    },
    async processVoice(msg, captured, sendText) {
        let media;
        try {
            media = await extractInboundMedia({
                channel: msg.channel,
                msgType: msg.msgType,
                messageObject: msg.messageObject,
            });
        }
        catch (err) {
            logger.error({ err, farmerId: captured.farmerId, msgType: msg.msgType }, 'WhatsApp media extract failed');
            await sendText(captured.phone, captured.language === 'ml'
                ? 'വോയ്സ് നോട്ട് ലോഡ് ചെയ്യാൻ കഴിഞ്ഞില്ല. വീണ്ടും അയയ്ക്കുക.'
                : 'We could not load your voice note. Please try again.');
            return;
        }
        if (!media.audioBuffer) {
            await sendText(captured.phone, captured.language === 'ml'
                ? 'വോയ്സ് നോട്ട് ലഭിച്ചില്ല. വീണ്ടും അയയ്ക്കുക.'
                : 'Could not receive voice note. Please try again.');
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
        let transcript = await transcriptionService.transcribeVoice(media.audioBuffer, media.audioMimeType ?? 'audio/ogg', captured.language);
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
    async processImage(msg, captured, sendText, senders) {
        const plots = await multiPlotService.listPlots(captured.farmerId);
        const context = await resolveDiagnosisContext({
            farmerId: captured.farmerId,
            symptomsText: msg.text || undefined,
        });
        const willReuse = await aiReuseService.peekMatch({
            farmerId: captured.farmerId,
            cropType: context.cropType,
            symptomsText: msg.text || undefined,
            activePlotId: context.activePlotId,
            compactHistory: context.compactHistory,
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
        let media;
        try {
            media = await extractInboundMedia({
                channel: msg.channel,
                msgType: msg.msgType,
                messageObject: msg.messageObject,
            });
        }
        catch (err) {
            logger.error({ err, farmerId: captured.farmerId, msgType: msg.msgType }, 'WhatsApp media extract failed');
            await sendText(captured.phone, captured.language === 'ml'
                ? 'ചിത്രം ലോഡ് ചെയ്യാൻ കഴിഞ്ഞില്ല. ദയവായി വീണ്ടും അയയ്ക്കുക.'
                : 'We could not load your photo. Please send the image again in a moment.');
            return;
        }
        if (!media.imageBase64) {
            await sendText(captured.phone, imageQualityMessage(captured.language, 'unsupported'));
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
            await sendText(captured.phone, diagnosisFlowService.duplicateImageReply(captured.language, ctx.diagnosis?.lastAdvisorySummary));
            return;
        }
        await recordImageHash(captured.farmerId, quality.contentHash);
        const hasCaptionCrop = Boolean(inferCropHint(msg.text || undefined));
        if (plots.length <= 1 && !hasCaptionCrop && senders) {
            const detected = await cropDetectionService.detectFromImage({
                imageBase64: media.imageBase64,
                imageMimeType: media.imageMimeType ?? 'image/jpeg',
                caption: msg.text || undefined,
            });
            if (detected.crop && detected.crop !== 'other' && detected.confidence >= 0.62) {
                await multiPlotService.setPrimaryCropType(captured.farmerId, detected.crop);
            }
            else {
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
    async processText(msg, captured, sendText) {
        await this.replyToText(msg, captured, sendText);
    },
    /** OpenAI chat for greetings/help; full Crop Doctor when symptoms are detailed. */
    async replyToText(msg, captured, sendText) {
        if (!msg.text?.trim()) {
            await sendText(captured.phone, captured.language === 'ml'
                ? 'ദയവായി ടെക്സ്റ്റ് അയയ്ക്കുക, വിളയുടെ ഫോട്ടോ, അല്ലെങ്കിൽ വോയ്സ് നോട്ട്.'
                : 'Please send a text message, crop photo, or voice note.');
            return;
        }
        await classifyCommercialLead(captured.farmerId, msg.text);
        const agriDiagnosisIntent = /crop|doctor|disease|pest|leaf|yellow|wilt|spot|fungus|symptom|ginger|pepper|വിള|രോഗ|കീട|பயிர|ಬೆಳೆ|फसल/i.test(msg.text) && msg.text.trim().length >= 25;
        if (env.ENABLE_AI_CROP_DOCTOR && agriDiagnosisIntent) {
            const activePlotId = await multiPlotService.getActivePlotId(captured.farmerId);
            const ctxPeek = await fetchCompactFarmerContext(captured.farmerId, { activePlotId });
            const willReuse = await aiReuseService.peekMatch({
                farmerId: captured.farmerId,
                cropType: ctxPeek.cropType,
                symptomsText: msg.text,
                activePlotId,
                compactHistory: formatCompactHistory(ctxPeek),
            });
            if (!willReuse) {
                const usage = await aiUsageControlService.checkAndConsume({
                    farmerId: captured.farmerId,
                    kind: 'text',
                    isPremium: captured.isPremium,
                });
                if (!usage.allowed) {
                    await sendText(captured.phone, aiUsageControlService.usageLimitMessage(captured.language, usage.reason));
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
                conversationHistory: await fetchRecentConversationHistory(captured.farmerId, 10),
            });
            await this.sendAndLog(captured.farmerId, captured.phone, reply, sendText);
            return;
        }
        await sendText(captured.phone, captured.language === 'ml'
            ? 'നമസ്കാരം! മോർബീസ് ക്രോപ്പ് ഡോക്ടർ. വിളയുടെ ഫോട്ടോ അയയ്ക്കുക അല്ലെങ്കിൽ പ്രശ്നം വിവരിക്കുക.'
            : 'Hello from Morbeez Crop Doctor! Send a crop photo or describe your crop problem (crop name + symptoms).');
    },
    async sendAndLog(farmerId, phone, text, sendText) {
        await sendText(phone, text);
        await farmerService.logInteraction(farmerId, 'whatsapp', 'outbound', text.slice(0, 500)).catch(() => { });
    },
    async runDiagnosis(params) {
        try {
            const sessCtx = await conversationSessionService.getContext(params.farmerId);
            const symptomsText = params.symptomsText?.trim() ||
                sessCtx.pendingSymptomsText ||
                undefined;
            const context = await resolveDiagnosisContext({
                farmerId: params.farmerId,
                symptomsText,
            });
            const contextPack = await contextPackService.build(params.farmerId);
            const result = await cropDoctorService.diagnose({
                farmerId: params.farmerId,
                cropType: context.cropType,
                cropStage: context.cropStage,
                language: params.language,
                symptomsText,
                voiceTranscript: params.voiceTranscript,
                imageBase64: params.imageBase64,
                imageMimeType: params.imageMimeType,
                channel: params.channel ?? 'whatsapp',
                compactHistory: context.compactHistory,
                contextPack,
            });
            const assessment = policyEngineService.evaluate(result.advisory, contextPack);
            const safety = validateAdvisorySafety(result.advisory, params.language);
            if (!safety.safe) {
                await params.sendText(params.phone, safety.farmerMessage);
                return;
            }
            await accuracyMetricsService.logDiagnosisEvent({
                sessionId: result.sessionId,
                farmerId: params.farmerId,
                cropType: context.cropType,
                confidence: result.advisory.confidence,
                escalated: Boolean(result.escalated),
                source: params.channel ?? 'whatsapp',
                weatherRisk: assessment.weatherRiskBand,
            });
            await createTelecallerTask({
                farmerId: params.farmerId,
                title: 'Symptom Confirmation Required',
                notes: `Probable issue: ${result.advisory.probableIssue}; confidence ${Math.round(result.advisory.confidence * 100)}%; crop ${context.cropType}`,
                priority: assessment.escalationPriority === 'urgent' ? 'urgent' : 'normal',
            });
            if (assessment.shouldRequestMoreEvidence) {
                await createTelecallerTask({
                    farmerId: params.farmerId,
                    title: 'Symptom confirmation required',
                    notes: `Confidence ${Math.round(result.advisory.confidence * 100)}%, Crop ${context.cropType}, WeatherRisk ${assessment.weatherRiskBand}`,
                    priority: assessment.escalationPriority === 'urgent' ? 'urgent' : 'high',
                });
                await params.sendText(params.phone, params.language === 'ml'
                    ? 'ലക്ഷണങ്ങൾ കൂടുതൽ സ്ഥിരീകരിക്കണം. ദയവായി കൂടുതൽ വ്യക്തമായ ഇല/വേരിന്റെ ചിത്രങ്ങൾ അയയ്ക്കുക. ടീം നിങ്ങളെ ബന്ധപ്പെടും.'
                    : 'Symptoms need further confirmation. Please send clearer leaf/root images. Our team will contact you.');
                await conversationSessionService.setState(params.farmerId, 'root_photos_requested');
                return;
            }
            if (assessment.needsValidationQuestion) {
                await createTelecallerTask({
                    farmerId: params.farmerId,
                    title: 'Telecaller symptom validation',
                    notes: `AI confidence in medium band. Issue: ${result.advisory.probableIssue}`,
                    priority: 'normal',
                });
                await params.sendText(params.phone, `${localizedSummary(result.advisory, params.language)}\n\n${validationQuestion(result.advisory.probableIssue, params.language)}`);
                await conversationSessionService.setState(params.farmerId, 'diagnosis');
                return;
            }
            let reply = localizedSummary(result.advisory, params.language);
            if (sessCtx.activePlotLabel) {
                reply = `📍 ${sessCtx.activePlotLabel}\n\n${reply}`;
            }
            reply += '\n\n— Morbeez AI-assisted advisory (not a guaranteed diagnosis).';
            if (result.reused) {
                reply +=
                    params.language === 'ml'
                        ? '\n\n(സമാനമായ മുൻ കേസിൽ നിന്നുള്ള ശുപാർശ — വേഗത്തിലുള്ള മറുപ്)'
                        : '\n\n(Based on a similar successful case in your region — fast reply)';
            }
            if (sessCtx.pendingSymptomsText) {
                await conversationSessionService.patchContext(params.farmerId, {
                    pendingSymptomsText: undefined,
                });
            }
            if (result.escalated) {
                reply += '\n\nOur agronomist team will review your case shortly.';
            }
            reply += `\n\nCrop Health Score: ${assessment.cropHealthScore}/100`;
            reply += `\nDisease Severity: ${assessment.diseaseSeverity}`;
            reply += `\nWeather Risk: ${assessment.weatherRiskBand}`;
            if (assessment.safetyNotes.length) {
                reply += `\n\n⚠️ ${assessment.safetyNotes.join(' ')}`;
            }
            const productBlock = shopifyLinksService.formatRecommendationsForWhatsApp(result.productRecommendations, params.language);
            if (productBlock)
                reply += `\n\n${productBlock}`;
            await this.sendAndLog(params.farmerId, params.phone, reply.slice(0, 4000), params.sendText);
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
        }
        catch (err) {
            logger.error({ err, farmerId: params.farmerId }, 'WhatsApp pipeline diagnosis failed');
            await params.sendText(params.phone, params.language === 'ml'
                ? 'ക്ഷമിക്കണം, ഇപ്പോൾ വിശകലനം ചെയ്യാൻ കഴിഞ്ഞില്ല. വീണ്ടും ശ്രമിക്കുക അല്ലെങ്കിൽ "call" ടൈപ്പ് ചെയ്യുക.'
                : 'Sorry, we could not analyze your message right now. Try again or type "call" for help.');
        }
    },
};
//# sourceMappingURL=whatsapp-inbound.pipeline.js.map