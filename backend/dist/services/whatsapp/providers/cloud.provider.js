import { env } from '../../../config/env.js';
import { AppError } from '../../../lib/errors.js';
const GRAPH = 'https://graph.facebook.com/v21.0';
export const cloudWhatsAppProvider = {
    async sendText(to, text) {
        if (!env.WHATSAPP_PHONE_NUMBER_ID || !env.WHATSAPP_ACCESS_TOKEN) {
            throw new AppError('WhatsApp Cloud API not configured', 503, 'WHATSAPP_NOT_CONFIGURED');
        }
        const phone = to.replace(/\D/g, '');
        const res = await fetch(`${GRAPH}/${env.WHATSAPP_PHONE_NUMBER_ID}/messages`, {
            method: 'POST',
            headers: {
                Authorization: `Bearer ${env.WHATSAPP_ACCESS_TOKEN}`,
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                messaging_product: 'whatsapp',
                to: phone,
                type: 'text',
                text: { body: text },
            }),
        });
        if (!res.ok) {
            const err = await res.text();
            throw new AppError('WhatsApp send failed', res.status, 'WHATSAPP_SEND_FAILED', err);
        }
    },
    async sendTemplate(to, templateName, params) {
        if (!env.WHATSAPP_PHONE_NUMBER_ID || !env.WHATSAPP_ACCESS_TOKEN) {
            throw new AppError('WhatsApp Cloud API not configured', 503, 'WHATSAPP_NOT_CONFIGURED');
        }
        const phone = to.replace(/\D/g, '');
        const res = await fetch(`${GRAPH}/${env.WHATSAPP_PHONE_NUMBER_ID}/messages`, {
            method: 'POST',
            headers: {
                Authorization: `Bearer ${env.WHATSAPP_ACCESS_TOKEN}`,
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                messaging_product: 'whatsapp',
                to: phone,
                type: 'template',
                template: {
                    name: templateName,
                    language: { code: 'en' },
                    components: [
                        {
                            type: 'body',
                            parameters: params.body.map((t) => ({ type: 'text', text: t })),
                        },
                    ],
                },
            }),
        });
        if (!res.ok) {
            const err = await res.text();
            throw new AppError('WhatsApp template send failed', res.status, 'WHATSAPP_TEMPLATE_FAILED', err);
        }
    },
};
//# sourceMappingURL=cloud.provider.js.map