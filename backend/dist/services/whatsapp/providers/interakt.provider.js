import { env } from '../../../config/env.js';
import { AppError } from '../../../lib/errors.js';
import { normalizePhone } from '../../../lib/phone.js';
const BASE = 'https://api.interakt.ai/v1/public';
/**
 * Interakt WhatsApp BSP adapter
 * Docs: https://www.interakt.shop/resource-center/api-doc/
 */
export const interaktWhatsAppProvider = {
    async sendText(to, text) {
        if (!env.INTERAKT_API_KEY) {
            throw new AppError('Interakt not configured', 503, 'INTERAKT_NOT_CONFIGURED');
        }
        const phone = normalizePhone(to);
        const res = await fetch(`${BASE}/message/`, {
            method: 'POST',
            headers: {
                Authorization: `Basic ${env.INTERAKT_API_KEY}`,
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                countryCode: '+91',
                phoneNumber: phone.startsWith('91') ? phone.slice(2) : phone,
                type: 'Text',
                data: { message: text },
            }),
        });
        if (!res.ok) {
            throw new AppError('Interakt send failed', res.status, 'INTERAKT_SEND_FAILED', await res.text());
        }
    },
    async sendTemplate(to, templateName, params) {
        if (!env.INTERAKT_API_KEY) {
            throw new AppError('Interakt not configured', 503, 'INTERAKT_NOT_CONFIGURED');
        }
        const phone = normalizePhone(to);
        const res = await fetch(`${BASE}/message/`, {
            method: 'POST',
            headers: {
                Authorization: `Basic ${env.INTERAKT_API_KEY}`,
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                countryCode: '+91',
                phoneNumber: phone.startsWith('91') ? phone.slice(2) : phone,
                type: 'Template',
                data: {
                    templateName,
                    languageCode: 'en',
                    bodyValues: params.body,
                },
            }),
        });
        if (!res.ok) {
            throw new AppError('Interakt template failed', res.status, 'INTERAKT_TEMPLATE_FAILED', await res.text());
        }
    },
};
//# sourceMappingURL=interakt.provider.js.map