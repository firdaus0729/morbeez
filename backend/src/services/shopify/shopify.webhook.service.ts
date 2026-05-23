import { eventBus } from '../../events/bus.js';
import { supabase } from '../../lib/supabase.js';
import { farmerService } from '../farmer/farmer.service.js';
import { logger } from '../../lib/logger.js';
import type { ShopifyOrder } from './shopify.client.js';

export interface ShopifyFulfillment {
  id: number;
  order_id: number;
  status: string;
  tracking_number?: string;
  tracking_company?: string;
  tracking_url?: string;
}

export const shopifyWebhookService = {
  async handleOrderCreate(order: ShopifyOrder): Promise<void> {
    await this.syncOrder(order);
    await eventBus.publish(
      'shopify.order.created',
      { shopifyOrderId: String(order.id), orderName: order.name },
      'shopify'
    );
  },

  async handleOrderPaid(order: ShopifyOrder): Promise<void> {
    await supabase
      .from('commerce_orders')
      .update({ payment_status: 'paid', updated_at: new Date().toISOString() })
      .eq('shopify_order_id', String(order.id));

    if (order.customer?.id && order.phone) {
      await farmerService.upsertFromShopifyCustomer({
        shopifyCustomerId: String(order.customer.id),
        phone: order.phone,
        name: order.customer.first_name ?? undefined,
      });
    }

    await eventBus.publish(
      'shopify.order.paid',
      { shopifyOrderId: String(order.id), orderName: order.name, total: order.total_price },
      'shopify'
    );
  },

  async handleFulfillment(fulfillment: ShopifyFulfillment): Promise<void> {
    await supabase.from('shipment_events').insert({
      shopify_order_id: String(fulfillment.order_id),
      provider: 'shopify',
      shipment_id: String(fulfillment.id),
      awb: fulfillment.tracking_number ?? null,
      courier: fulfillment.tracking_company ?? null,
      status: fulfillment.status,
      event_type: 'fulfillment.update',
      raw_payload: fulfillment,
    });

    await supabase
      .from('commerce_orders')
      .update({
        fulfillment_status: fulfillment.status,
        updated_at: new Date().toISOString(),
      })
      .eq('shopify_order_id', String(fulfillment.order_id));

    if (fulfillment.status === 'success' || fulfillment.status === 'delivered') {
      await eventBus.publish(
        'shopify.order.fulfilled',
        {
          shopifyOrderId: String(fulfillment.order_id),
          trackingNumber: fulfillment.tracking_number,
          trackingUrl: fulfillment.tracking_url,
        },
        'shopify'
      );
    }
  },

  async syncOrder(order: ShopifyOrder): Promise<void> {
    const isCod =
      order.tags?.toLowerCase().includes('cod') ||
      order.financial_status === 'pending';

    const { error } = await supabase.from('commerce_orders').upsert(
      {
        shopify_order_id: String(order.id),
        order_name: order.name,
        email: order.email,
        phone: order.phone,
        financial_status: order.financial_status,
        fulfillment_status: order.fulfillment_status,
        total_amount: parseFloat(order.total_price),
        currency: order.currency,
        is_cod: isCod,
        raw_payload: order,
        updated_at: new Date().toISOString(),
      },
      { onConflict: 'shopify_order_id' }
    );

    if (error) logger.error({ error, orderId: order.id }, 'Order sync failed');
  },
};
