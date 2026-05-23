import { env } from '../../config/env.js';
import { eventBus } from '../../events/bus.js';
import { supabase } from '../../lib/supabase.js';
import { farmerService } from '../farmer/farmer.service.js';
import { cloudWhatsAppProvider } from './providers/cloud.provider.js';
import { watiWhatsAppProvider } from './providers/wati.provider.js';
import { interaktWhatsAppProvider } from './providers/interakt.provider.js';

function getProvider() {
  if (env.WHATSAPP_PROVIDER === 'wati') return watiWhatsAppProvider;
  if (env.WHATSAPP_PROVIDER === 'interakt') return interaktWhatsAppProvider;
  return cloudWhatsAppProvider;
}

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
      const text =
        (msg.text as Record<string, string> | undefined)?.body ??
        (msg.type as string) ??
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
        message_type: String(msg.type ?? 'text'),
        content: text,
        external_message_id: String(msg.id ?? ''),
        raw_payload: msg,
      });

      await this.classifyAndCreateLead(farmer.id, text);

      await eventBus.publish(
        'whatsapp.message.received',
        { phone: from, farmerId: farmer.id, text },
        'whatsapp'
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
