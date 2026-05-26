import { env } from '../../config/env.js';
import { AppError } from '../../lib/errors.js';
import { normalizePhone } from '../../lib/phone.js';
import { whatsappSessionService } from './whatsapp-session.service.js';
type SendProvider = {
  sendText: (to: string, text: string) => Promise<void>;
  sendTemplate: (to: string, name: string, params: { body: string[] }) => Promise<void>;
};

export const whatsappOutboundService = {
  async sendToFarmer(
    provider: SendProvider,
    params: {
      phone: string;
      farmerId: string;
      text: string;
      forceTemplate?: boolean;
      templateName?: string;
      templateBodyFields?: string[];
    }
  ): Promise<{ mode: 'session' | 'template' }> {
    const to = normalizePhone(params.phone);
    const inSession = await whatsappSessionService.hasActiveInboundSession(params.farmerId);

    if (!params.forceTemplate && inSession) {
      await provider.sendText(to, params.text);
      return { mode: 'session' };
    }

    const templateName =
      params.templateName?.trim() ||
      env.WHATSAPP_OUTBOUND_TEMPLATE?.trim() ||
      env.WHATSAPP_WELCOME_TEMPLATE?.trim();

    if (!templateName) {
      throw new AppError(
        'Farmer is outside the 24-hour WhatsApp window. Set WHATSAPP_OUTBOUND_TEMPLATE in .env.',
        400,
        'WHATSAPP_TEMPLATE_REQUIRED'
      );
    }

    const fields = params.templateBodyFields?.length
      ? params.templateBodyFields
      : [params.text.slice(0, 200)];

    await provider.sendTemplate(to, templateName, { body: fields });
    return { mode: 'template' };
  },

  async sendWelcomeTemplate(
    provider: SendProvider,
    params: { phone: string; farmerId: string; profileName?: string }
  ): Promise<boolean> {
    const template = env.WHATSAPP_WELCOME_TEMPLATE?.trim();
    if (!template) return false;

    const should = await whatsappSessionService.shouldSendWelcomeTemplate(params.farmerId);
    if (!should) return false;

    const to = normalizePhone(params.phone);
    const name = params.profileName?.split(' ')[0] ?? 'Farmer';

    await provider.sendTemplate(to, template, {
      body: [name],
    });

    await whatsappSessionService.markWelcomeTemplateSent(params.farmerId);
    return true;
  },
};
