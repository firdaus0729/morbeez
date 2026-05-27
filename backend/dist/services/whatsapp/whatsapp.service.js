import { env } from '../../config/env.js';
import { cloudWhatsAppProvider } from './providers/cloud.provider.js';
import { watiWhatsAppProvider } from './providers/wati.provider.js';
import { interaktWhatsAppProvider } from './providers/interakt.provider.js';
import { adsgyaniWhatsAppProvider } from './providers/adsgyani.provider.js';
import { whatsappInboundPipeline } from './pipeline/whatsapp-inbound.pipeline.js';
import { whatsappOutboundService } from './whatsapp-outbound.service.js';
import { logger } from '../../lib/logger.js';
function getProvider() {
    if (env.WHATSAPP_PROVIDER === 'adsgyani')
        return adsgyaniWhatsAppProvider;
    if (env.WHATSAPP_PROVIDER === 'wati')
        return watiWhatsAppProvider;
    if (env.WHATSAPP_PROVIDER === 'interakt')
        return interaktWhatsAppProvider;
    return cloudWhatsAppProvider;
}
/** Ads Gyani Settings → API & Webhook: { contact, message } */
export function parseAdsGyaniWebhook(payload) {
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
    const profileName = [contact?.first_name, contact?.last_name]
        .filter(Boolean)
        .join(' ')
        .trim() || contact?.name;
    return {
        from: fromRaw,
        msgType,
        text,
        messageId,
        profileName: profileName || undefined,
        messageObject: message,
    };
}
function toInboundFromAdsGyani(payload, parsed) {
    return {
        channel: 'whatsapp_adsgyani',
        phone: parsed.from,
        messageId: parsed.messageId,
        msgType: parsed.msgType,
        text: parsed.text,
        profileName: parsed.profileName,
        rawPayload: payload,
        messageObject: parsed.messageObject,
        attribution: {
            referralSource: payload.referral_source ?? 'whatsapp',
            campaignSource: payload.campaign_source,
            affiliateSource: payload.affiliate_source,
        },
    };
}
export const whatsappService = {
    getProvider,
    async sendText(to, text) {
        try {
            await getProvider().sendText(to, text);
            logger.info({ to: to.replace(/\d(?=\d{4})/g, '*'), chars: text.length }, 'WhatsApp outbound sent');
        }
        catch (err) {
            logger.error({ err, to }, 'WhatsApp outbound failed');
            throw err;
        }
    },
    async sendList(params) {
        const provider = getProvider();
        if (!provider.sendList) {
            // Fallback: convert list to plain text.
            const flat = params.sections
                .flatMap((s) => s.rows.map((r) => `- ${r.title}${r.description ? `: ${r.description}` : ''}`))
                .join('\n');
            await this.sendText(params.to, `${params.body}\n\n${flat}`);
            return;
        }
        await provider.sendList(params);
    },
    async sendTemplate(to, templateName, params) {
        await getProvider().sendTemplate(to, templateName, params);
    },
    async sendToFarmer(params) {
        return whatsappOutboundService.sendToFarmer(getProvider(), params);
    },
    async sendWelcomeTemplate(params) {
        return whatsappOutboundService.sendWelcomeTemplate(getProvider(), params);
    },
    async handleAdsGyaniInbound(payload) {
        if (payload.entry) {
            await this.handleCloudInbound(payload);
            return;
        }
        const parsed = parseAdsGyaniWebhook(payload);
        if (!parsed)
            return;
        await whatsappInboundPipeline.process(toInboundFromAdsGyani(payload, parsed), {
            text: (phone, text) => this.sendText(phone, text),
            list: (p) => this.sendList({
                to: p.phone,
                header: p.header,
                body: p.body,
                buttonText: p.buttonText,
                sections: p.sections,
            }),
        }, {
            sendWelcomeTemplate: (phone, farmerId, profileName) => this.sendWelcomeTemplate({ phone, farmerId, profileName }),
        });
    },
    async handleCloudInbound(payload) {
        const entry = payload.entry?.[0];
        const changes = entry?.changes?.[0];
        const value = changes?.value;
        const messages = value?.messages;
        const contacts = value?.contacts;
        const statuses = value?.statuses;
        if (!messages?.length) {
            if (statuses?.length) {
                logger.debug({ statusCount: statuses.length }, 'Meta WhatsApp status webhook (delivery/read) — no inbound message');
            }
            return;
        }
        for (const msg of messages) {
            try {
                const from = String(msg.from ?? '');
                if (!from)
                    continue;
                const msgType = String(msg.type ?? 'text');
                let text = msg.text?.body ??
                    msg.button?.text ??
                    '';
                const interactive = msg.interactive;
                if (!text && interactive) {
                    const btn = interactive.button_reply;
                    const list = interactive.list_reply;
                    // Prefer stable IDs for state machines (language/menu), fallback to title.
                    text = btn?.id ?? list?.id ?? btn?.title ?? list?.title ?? '';
                }
                if (!text) {
                    text = msg.image?.caption ?? '';
                }
                const contact = contacts?.find((c) => String(c.wa_id) === from);
                const profile = contact?.profile;
                logger.info({ from, msgType, hasText: Boolean(text) }, 'WhatsApp Cloud inbound message');
                const inbound = {
                    channel: 'whatsapp_cloud',
                    phone: from,
                    messageId: String(msg.id ?? ''),
                    msgType,
                    text: text ?? '',
                    profileName: profile?.name,
                    rawPayload: msg,
                    messageObject: msg,
                    attribution: {
                        referralSource: 'whatsapp',
                        campaignSource: value?.metadata?.campaign_id,
                    },
                };
                await whatsappInboundPipeline.process(inbound, {
                    text: (phone, t) => this.sendText(phone, t),
                    list: (p) => this.sendList({
                        to: p.phone,
                        header: p.header,
                        body: p.body,
                        buttonText: p.buttonText,
                        sections: p.sections,
                    }),
                }, {
                    sendWelcomeTemplate: (phone, farmerId, profileName) => this.sendWelcomeTemplate({ phone, farmerId, profileName }),
                });
            }
            catch (err) {
                logger.error({ err, msgId: msg.id }, 'WhatsApp inbound message processing failed');
            }
        }
    },
};
//# sourceMappingURL=whatsapp.service.js.map