import { env } from '../../config/env.js';
import { eventBus } from '../../events/bus.js';
import { supabase } from '../../lib/supabase.js';
import { downloadWhatsAppMedia } from '../../lib/whatsapp-media.js';
import { logger } from '../../lib/logger.js';
import { farmerService } from '../farmer/farmer.service.js';
import { cropDoctorService } from '../ai/crop-doctor.service.js';
import { transcriptionService } from '../ai/transcription.service.js';
import { cloudWhatsAppProvider } from './providers/cloud.provider.js';
import { watiWhatsAppProvider } from './providers/wati.provider.js';
import { interaktWhatsAppProvider } from './providers/interakt.provider.js';
import { adsgyaniWhatsAppProvider } from './providers/adsgyani.provider.js';
function getProvider() {
    if (env.WHATSAPP_PROVIDER === 'adsgyani')
        return adsgyaniWhatsAppProvider;
    if (env.WHATSAPP_PROVIDER === 'wati')
        return watiWhatsAppProvider;
    if (env.WHATSAPP_PROVIDER === 'interakt')
        return interaktWhatsAppProvider;
    return cloudWhatsAppProvider;
}
const CROP_DOCTOR_KEYWORDS = /crop|doctor|ginger|വിള|രോഗ|ചിത്ര/i;
/** Ads Gyani Settings → API & Webhook example: { contact, message } */
function parseAdsGyaniWebhook(payload) {
    const contact = payload.contact;
    const message = payload.message;
    const fromRaw = String(contact?.phone_number ??
        payload.from ??
        payload.phone_number ??
        payload.wa_id ??
        payload.sender ??
        '').replace(/\D/g, '');
    if (!fromRaw)
        return null;
    const msgType = String(message?.type ?? message?.message_type ?? payload.type ?? payload.message_type ?? 'text');
    const textObj = message?.text;
    const buttonObj = message?.button;
    const interactive = message?.interactive;
    let text = '';
    if (typeof message?.message_body === 'string')
        text = message.message_body;
    else if (textObj?.body)
        text = textObj.body;
    else if (typeof message?.body === 'string')
        text = message.body;
    else if (buttonObj?.text)
        text = buttonObj.text;
    else if (typeof message?.caption === 'string')
        text = message.caption;
    else if (interactive) {
        const btnReply = interactive.button_reply;
        const listReply = interactive.list_reply;
        text = btnReply?.title ?? listReply?.title ?? '';
    }
    else if (typeof payload.text === 'string')
        text = payload.text;
    else if (typeof payload.message === 'string')
        text = payload.message;
    else if (typeof payload.body === 'string')
        text = payload.body;
    const messageId = String(message?.id ?? message?.wamid ?? message?.message_id ?? payload.id ?? payload.message_id ?? '');
    return { from: fromRaw, msgType, text, messageId };
}
export const whatsappService = {
    async sendText(to, text) {
        await getProvider().sendText(to, text);
    },
    async sendTemplate(to, templateName, params) {
        await getProvider().sendTemplate(to, templateName, params);
    },
    /** Ads Gyani webhook — dashboard format { contact, message } or legacy flat / Meta entry */
    async handleAdsGyaniInbound(payload) {
        if (payload.entry) {
            await this.handleCloudInbound(payload);
            return;
        }
        const parsed = parseAdsGyaniWebhook(payload);
        if (!parsed)
            return;
        const { from, msgType, text, messageId } = parsed;
        const farmer = await farmerService.upsertByPhone({
            phone: from,
            preferredLanguage: 'en',
            source: 'whatsapp',
        });
        await supabase.from('interaction_logs').insert({
            farmer_id: farmer.id,
            channel: 'whatsapp',
            direction: 'inbound',
            message_type: msgType,
            content: text || msgType,
            external_message_id: messageId,
            raw_payload: payload,
        });
        if (text && CROP_DOCTOR_KEYWORDS.test(text) && env.ENABLE_AI_CROP_DOCTOR) {
            await this.sendText(from, 'Send a clear photo of your crop issue for AI-assisted analysis (ginger supported).');
        }
        else if (text) {
            await this.classifyAndCreateLead(farmer.id, text);
        }
        await eventBus.publish('whatsapp.message.received', { phone: from, farmerId: farmer.id, text, messageType: msgType }, 'whatsapp');
    },
    async handleCloudInbound(payload) {
        const entry = payload.entry?.[0];
        const changes = entry?.changes?.[0];
        const value = changes?.value;
        const messages = value?.messages;
        if (!messages?.length)
            return;
        for (const msg of messages) {
            const from = String(msg.from ?? '');
            const msgType = String(msg.type ?? 'text');
            const text = msg.text?.body ??
                msg.button?.text ??
                '';
            const farmer = await farmerService.upsertByPhone({
                phone: from,
                preferredLanguage: 'en',
                source: 'whatsapp',
            });
            await supabase.from('interaction_logs').insert({
                farmer_id: farmer.id,
                channel: 'whatsapp',
                direction: 'inbound',
                message_type: msgType,
                content: text || msgType,
                external_message_id: String(msg.id ?? ''),
                raw_payload: msg,
            });
            if (env.ENABLE_AI_CROP_DOCTOR && (msgType === 'image' || msgType === 'audio')) {
                await this.handleCropDoctorMedia(farmer.id, from, msg, msgType, farmer.preferred_language ?? 'en');
            }
            else if (text && CROP_DOCTOR_KEYWORDS.test(text) && env.ENABLE_AI_CROP_DOCTOR) {
                await this.sendText(from, 'Send a clear photo of your crop issue for AI-assisted analysis (ginger supported).');
            }
            else {
                await this.classifyAndCreateLead(farmer.id, text);
            }
            await eventBus.publish('whatsapp.message.received', { phone: from, farmerId: farmer.id, text, messageType: msgType }, 'whatsapp');
        }
    },
    async handleCropDoctorMedia(farmerId, phone, msg, msgType, language) {
        try {
            let imageBase64;
            let imageMimeType;
            let voiceTranscript;
            if (msgType === 'image') {
                const image = msg.image;
                const mediaId = image?.id;
                if (!mediaId)
                    return;
                const { buffer, mimeType } = await downloadWhatsAppMedia(mediaId);
                imageBase64 = buffer.toString('base64');
                imageMimeType = mimeType;
            }
            if (msgType === 'audio') {
                const audio = msg.audio;
                const mediaId = audio?.id;
                if (!mediaId)
                    return;
                const { buffer, mimeType } = await downloadWhatsAppMedia(mediaId);
                voiceTranscript = await transcriptionService.transcribeVoice(buffer, mimeType, language === 'ml' ? 'ml' : 'en');
            }
            const result = await cropDoctorService.diagnose({
                farmerId,
                cropType: 'ginger',
                language: language === 'ml' ? 'ml' : 'en',
                imageBase64,
                imageMimeType,
                voiceTranscript,
                channel: 'whatsapp',
            });
            const summary = language === 'ml' ? result.advisory.farmerSummaryMl : result.advisory.farmerSummaryEn;
            let reply = `${summary}\n\n— Morbeez AI-assisted advisory (not a guaranteed diagnosis).`;
            if (result.escalated) {
                reply += '\n\nOur agronomist team will review your case shortly.';
            }
            if (result.productRecommendations.length) {
                reply += '\n\nSuggested products:\n';
                reply += result.productRecommendations
                    .slice(0, 3)
                    .map((p) => `• ${p.productTitle}`)
                    .join('\n');
            }
            await this.sendText(phone, reply.slice(0, 4000));
        }
        catch (err) {
            logger.error({ err, farmerId }, 'WhatsApp crop doctor failed');
            await this.sendText(phone, 'Sorry, we could not analyze your message right now. Please try again or request a callback.');
        }
    },
    async classifyAndCreateLead(farmerId, text) {
        const lower = text.toLowerCase();
        let intent = null;
        if (/quote|quotation|price|rate/i.test(lower))
            intent = 'quotation';
        else if (/call|callback/i.test(lower))
            intent = 'callback';
        else if (/help|support|problem/i.test(lower))
            intent = 'support';
        if (intent) {
            await supabase.from('leads').insert({
                farmer_id: farmerId,
                source: 'whatsapp',
                intent,
                status: 'new',
                notes: text.slice(0, 500),
            });
            if (intent === 'quotation') {
                await eventBus.publish('quotation.requested', { farmerId, text }, 'whatsapp');
            }
        }
    },
};
//# sourceMappingURL=whatsapp.service.js.map