import { env } from '../../../config/env.js';
import { AppError } from '../../../lib/errors.js';

/**
 * WATI adapter — same interface as Cloud API for provider swap.
 * https://docs.wati.io/
 */
export const watiWhatsAppProvider = {
  async sendText(to: string, text: string): Promise<void> {
    if (!env.WATI_API_ENDPOINT || !env.WATI_ACCESS_TOKEN) {
      throw new AppError('WATI not configured', 503, 'WATI_NOT_CONFIGURED');
    }

    const phone = to.replace(/\D/g, '');
    const res = await fetch(
      `${env.WATI_API_ENDPOINT}/api/v1/sendSessionMessage/${phone}?messageText=${encodeURIComponent(text)}`,
      {
        method: 'POST',
        headers: { Authorization: `Bearer ${env.WATI_ACCESS_TOKEN}` },
      }
    );

    if (!res.ok) {
      throw new AppError('WATI send failed', res.status, 'WATI_SEND_FAILED', await res.text());
    }
  },

  async sendTemplate(to: string, templateName: string, params: { body: string[] }): Promise<void> {
    if (!env.WATI_API_ENDPOINT || !env.WATI_ACCESS_TOKEN) {
      throw new AppError('WATI not configured', 503, 'WATI_NOT_CONFIGURED');
    }

    const phone = to.replace(/\D/g, '');
    const res = await fetch(`${env.WATI_API_ENDPOINT}/api/v1/sendTemplateMessage`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${env.WATI_ACCESS_TOKEN}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        whatsappNumber: phone,
        template_name: templateName,
        broadcast_name: 'morbeez',
        parameters: params.body.map((value) => ({ name: '1', value })),
      }),
    });

    if (!res.ok) {
      throw new AppError('WATI template failed', res.status, 'WATI_TEMPLATE_FAILED', await res.text());
    }
  },
};
