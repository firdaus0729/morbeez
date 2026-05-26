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
const CROP_MEDIA_TYPES = new Set(['image', 'image_message', 'document']);
const VOICE_TYPES = new Set(['audio', 'voice', 'audio_message']);
function localizedSummary(advisory, language) {
    if (language === 'ml' && advisory.farmerSummaryMl)
        return advisory.farmerSummaryMl;
    return advisory.farmerSummaryEn;
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
export const whatsappInboundPipeline = {
    async process(msg, sendText, hooks) {
        const detected = detectLanguageFromText(msg.text);
        const language = normalizeLanguage(detected, null);
        const captured = await leadCaptureService.captureAndIdentify(msg, language);
        await supabase.from('interaction_logs').insert({
            farmer_id: captured.farmerId,
            channel: 'whatsapp',
            direction: 'inbound',
            message_type: msg.msgType,
            content: msg.text || msg.msgType,
            external_message_id: msg.messageId,
            raw_payload: msg.rawPayload,
        });
        if (hooks?.sendWelcomeTemplate) {
            await hooks.sendWelcomeTemplate(msg.phone, captured.farmerId, msg.profileName).catch(() => { });
        }
        if (!env.ENABLE_AI_CROP_DOCTOR) {
            if (msg.text)
                await classifyCommercialLead(captured.farmerId, msg.text);
            await eventBus.publish('whatsapp.message.received', { phone: msg.phone, farmerId: captured.farmerId, text: msg.text, messageType: msg.msgType }, 'whatsapp');
            return;
        }
        const hasCropMedia = CROP_MEDIA_TYPES.has(msg.msgType) || VOICE_TYPES.has(msg.msgType);
        const guard = validateAgricultureIntent({ text: msg.text, hasCropMedia });
        if (!guard.allowed) {
            await sendText(msg.phone, guardRejectionMessage(captured.language));
            return;
        }
        const faqHit = msg.text ? await faqCacheService.match(msg.text, captured.language) : null;
        if (faqHit && !hasCropMedia) {
            await sendText(msg.phone, faqHit);
            return;
        }
        if (VOICE_TYPES.has(msg.msgType)) {
            await this.processVoice(msg, captured, sendText);
        }
        else if (CROP_MEDIA_TYPES.has(msg.msgType)) {
            await this.processImage(msg, captured, sendText);
        }
        else if (msg.text) {
            await this.processText(msg, captured, sendText);
        }
        await eventBus.publish('whatsapp.message.received', { phone: msg.phone, farmerId: captured.farmerId, text: msg.text, messageType: msg.msgType }, 'whatsapp');
    },
    async processVoice(msg, captured, sendText) {
        const media = await extractInboundMedia({
            channel: msg.channel,
            msgType: msg.msgType,
            messageObject: msg.messageObject,
        });
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
    async processImage(msg, captured, sendText) {
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
    async processText(msg, captured, sendText) {
        const usage = await aiUsageControlService.checkAndConsume({
            farmerId: captured.farmerId,
            kind: 'text',
            isPremium: captured.isPremium,
        });
        if (!usage.allowed) {
            await sendText(captured.phone, aiUsageControlService.usageLimitMessage(captured.language, usage.reason));
            return;
        }
        const agriIntent = /crop|doctor|disease|pest|leaf|വിള|രോഗ|பயிர|ಬೆಳೆ|फसल/i.test(msg.text) ||
            msg.text.length > 40;
        if (agriIntent) {
            await this.runDiagnosis({
                farmerId: captured.farmerId,
                phone: captured.phone,
                language: captured.language,
                symptomsText: msg.text,
                sendText,
            });
        }
        else {
            await classifyCommercialLead(captured.farmerId, msg.text);
            await sendText(captured.phone, captured.language === 'ml'
                ? 'വിള പ്രശ്നത്തിന്റെ ഫോട്ടോ അയയ്ക്കുക, അല്ലെങ്കിൽ "quote" / "call" ടൈപ്പ് ചെയ്യുക.'
                : 'Send a crop photo for AI advisory, or type "quote" for prices / "call" for callback.');
        }
    },
    async runDiagnosis(params) {
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
            const productBlock = shopifyLinksService.formatRecommendationsForWhatsApp(result.productRecommendations, params.language);
            if (productBlock)
                reply += `\n\n${productBlock}`;
            await params.sendText(params.phone, reply.slice(0, 4000));
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