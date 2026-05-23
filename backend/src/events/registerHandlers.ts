import { eventBus } from './bus.js';
import { logger } from '../lib/logger.js';
import { shiprocketService } from '../services/shiprocket/shiprocket.service.js';
import { whatsappService } from '../services/whatsapp/whatsapp.service.js';
import { env } from '../config/env.js';

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

  logger.info('Event handlers registered');
}
