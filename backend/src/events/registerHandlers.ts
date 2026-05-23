import { eventBus } from './bus.js';
import { logger } from '../lib/logger.js';
import { shiprocketService } from '../services/shiprocket/shiprocket.service.js';
import { whatsappService } from '../services/whatsapp/whatsapp.service.js';
import { env } from '../config/env.js';
import { supabase } from '../lib/supabase.js';

/** Wire domain reactions — keep thin; logic lives in services */
export function registerEventHandlers(): void {
  eventBus.on('shopify.order.paid', async (event) => {
    const orderId = event.payload.shopifyOrderId as string | undefined;
    if (!orderId) return;

    if (env.ENABLE_SHIPROCKET_AUTO_SHIP) {
      await shiprocketService.createShipmentForShopifyOrder(orderId).catch((err) => {
        logger.error({ err, orderId }, 'Auto-shipment failed');
      });
    }
  });

  eventBus.on('whatsapp.message.received', async (event) => {
    const phone = event.payload.phone as string | undefined;
    if (!phone) return;

    if (env.ENABLE_WHATSAPP_AUTO_REPLY) {
      await whatsappService.sendTemplate(phone, 'welcome_farmer', {
        body: ['Thank you for contacting Morbeez. Our team will respond shortly.'],
      });
    }
  });

  eventBus.on('quotation.requested', async (event) => {
    logger.info({ eventId: event.id }, 'Quotation requested — telecaller queue (M2)');
  });

  eventBus.on('shopify.order.fulfilled', async (event) => {
    logger.info(
      { orderId: event.payload.shopifyOrderId, tracking: event.payload.trackingNumber },
      'Order fulfilled'
    );
  });

  eventBus.on('advisory.escalated', async (event) => {
    logger.warn(
      {
        sessionId: event.payload.sessionId,
        escalationId: event.payload.escalationId,
        priority: event.payload.priority,
      },
      'Agronomist escalation created'
    );
  });

  eventBus.on('advisory.completed', async (event) => {
    const farmerId = event.payload.farmerId as string | undefined;
    const escalated = event.payload.escalated as boolean | undefined;
    if (!farmerId || escalated) return;

    const { data: farmer } = await supabase
      .from('farmers')
      .select('phone, preferred_language')
      .eq('id', farmerId)
      .single();

    if (farmer?.phone && env.ENABLE_WHATSAPP_AUTO_REPLY) {
      const msg =
        farmer.preferred_language === 'ml'
          ? 'നിങ്ങളുടെ വിള വിശകലനം പൂർത്തിയായി. കൂടുതൽ വിവരങ്ങൾക്ക് മറുപടി നൽകുക.'
          : 'Your crop advisory is ready. Reply for more details or a callback.';
      await whatsappService.sendText(farmer.phone, msg).catch((err) => {
        logger.error({ err }, 'Advisory WhatsApp notify failed');
      });
    }
  });

  logger.info('Event handlers registered');
}
