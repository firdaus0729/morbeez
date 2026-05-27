import { env } from '../../../config/env.js';
import { AppError } from '../../../lib/errors.js';

const GRAPH = 'https://graph.facebook.com/v21.0';

export const cloudWhatsAppProvider = {
  async sendText(to: string, text: string): Promise<void> {
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

  async sendTemplate(
    to: string,
    templateName: string,
    params: { body: string[] }
  ): Promise<void> {
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

  /** Interactive list (use for >3 options like language selection/menu). */
  async sendList(params: {
    to: string;
    header?: string;
    body: string;
    buttonText: string;
    sections: Array<{
      title: string;
      rows: Array<{ id: string; title: string; description?: string }>;
    }>;
  }): Promise<void> {
    if (!env.WHATSAPP_PHONE_NUMBER_ID || !env.WHATSAPP_ACCESS_TOKEN) {
      throw new AppError('WhatsApp Cloud API not configured', 503, 'WHATSAPP_NOT_CONFIGURED');
    }

    const phone = params.to.replace(/\D/g, '');
    const res = await fetch(`${GRAPH}/${env.WHATSAPP_PHONE_NUMBER_ID}/messages`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${env.WHATSAPP_ACCESS_TOKEN}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        messaging_product: 'whatsapp',
        to: phone,
        type: 'interactive',
        interactive: {
          type: 'list',
          header: params.header ? { type: 'text', text: params.header.slice(0, 60) } : undefined,
          body: { text: params.body.slice(0, 1024) },
          action: {
            button: params.buttonText.slice(0, 20),
            sections: params.sections.map((s) => ({
              title: s.title.slice(0, 24),
              rows: s.rows.slice(0, 10).map((r) => ({
                id: r.id.slice(0, 200),
                title: r.title.slice(0, 24),
                description: r.description ? r.description.slice(0, 72) : undefined,
              })),
            })),
          },
        },
      }),
    });

    if (!res.ok) {
      const err = await res.text();
      throw new AppError('WhatsApp list send failed', res.status, 'WHATSAPP_LIST_FAILED', err);
    }
  },

  /** Quick-reply buttons (max 3). */
  async sendButtons(params: {
    to: string;
    body: string;
    buttons: Array<{ id: string; title: string }>;
  }): Promise<void> {
    if (!env.WHATSAPP_PHONE_NUMBER_ID || !env.WHATSAPP_ACCESS_TOKEN) {
      throw new AppError('WhatsApp Cloud API not configured', 503, 'WHATSAPP_NOT_CONFIGURED');
    }

    const phone = params.to.replace(/\D/g, '');
    const res = await fetch(`${GRAPH}/${env.WHATSAPP_PHONE_NUMBER_ID}/messages`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${env.WHATSAPP_ACCESS_TOKEN}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        messaging_product: 'whatsapp',
        to: phone,
        type: 'interactive',
        interactive: {
          type: 'button',
          body: { text: params.body.slice(0, 1024) },
          action: {
            buttons: params.buttons.slice(0, 3).map((b) => ({
              type: 'reply',
              reply: { id: b.id.slice(0, 256), title: b.title.slice(0, 20) },
            })),
          },
        },
      }),
    });

    if (!res.ok) {
      const err = await res.text();
      throw new AppError('WhatsApp buttons send failed', res.status, 'WHATSAPP_BUTTONS_FAILED', err);
    }
  },
};
