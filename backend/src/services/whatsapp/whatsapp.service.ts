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

function getProvider() {
  if (env.WHATSAPP_PROVIDER === 'wati') return watiWhatsAppProvider;
  if (env.WHATSAPP_PROVIDER === 'interakt') return interaktWhatsAppProvider;
  return cloudWhatsAppProvider;
}

const CROP_DOCTOR_KEYWORDS = /crop|doctor|ginger|വിള|രോഗ|ചിത്ര/i;

export const whatsappService = {
  async sendText(to: string, text: string): Promise<void> {
    await getProvider().sendText(to, text);
  },

  async sendTemplate(to: string, templateName: string, params: { body: string[] }): Promise<void> {
    await getProvider().sendTemplate(to, templateName, params);
  },

  async handleCloudInbound(payload: Record<string, unknown>): Promise<void> {
    const entry = (payload.entry as Array<Record<string, unknown>>)?.[0];
    const changes = (entry?.changes as Array<Record<string, unknown>>)?.[0];
    const value = changes?.value as Record<string, unknown> | undefined;
    const messages = value?.messages as Array<Record<string, unknown>> | undefined;

    if (!messages?.length) return;

    for (const msg of messages) {
      const from = String(msg.from ?? '');
      const msgType = String(msg.type ?? 'text');
      const text =
        (msg.text as Record<string, string> | undefined)?.body ??
        (msg.button as Record<string, string> | undefined)?.text ??
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
      } else if (text && CROP_DOCTOR_KEYWORDS.test(text) && env.ENABLE_AI_CROP_DOCTOR) {
        await this.sendText(
          from,
          'Send a clear photo of your crop issue for AI-assisted analysis (ginger supported).'
        );
      } else {
        await this.classifyAndCreateLead(farmer.id, text);
      }

      await eventBus.publish(
        'whatsapp.message.received',
        { phone: from, farmerId: farmer.id, text, messageType: msgType },
        'whatsapp'
      );
    }
  },

  async handleCropDoctorMedia(
    farmerId: string,
    phone: string,
    msg: Record<string, unknown>,
    msgType: string,
    language: string
  ): Promise<void> {
    try {
      let imageBase64: string | undefined;
      let imageMimeType: string | undefined;
      let voiceTranscript: string | undefined;

      if (msgType === 'image') {
        const image = msg.image as Record<string, string> | undefined;
        const mediaId = image?.id;
        if (!mediaId) return;
        const { buffer, mimeType } = await downloadWhatsAppMedia(mediaId);
        imageBase64 = buffer.toString('base64');
        imageMimeType = mimeType;
      }

      if (msgType === 'audio') {
        const audio = msg.audio as Record<string, string> | undefined;
        const mediaId = audio?.id;
        if (!mediaId) return;
        const { buffer, mimeType } = await downloadWhatsAppMedia(mediaId);
        voiceTranscript = await transcriptionService.transcribeVoice(
          buffer,
          mimeType,
          language === 'ml' ? 'ml' : 'en'
        );
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

      const summary =
        language === 'ml' ? result.advisory.farmerSummaryMl : result.advisory.farmerSummaryEn;

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
    } catch (err) {
      logger.error({ err, farmerId }, 'WhatsApp crop doctor failed');
      await this.sendText(
        phone,
        'Sorry, we could not analyze your message right now. Please try again or request a callback.'
      );
    }
  },

  async classifyAndCreateLead(farmerId: string, text: string): Promise<void> {
    const lower = text.toLowerCase();
    let intent: string | null = null;

    if (/quote|quotation|price|rate/i.test(lower)) intent = 'quotation';
    else if (/call|callback/i.test(lower)) intent = 'callback';
    else if (/help|support|problem/i.test(lower)) intent = 'support';

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
