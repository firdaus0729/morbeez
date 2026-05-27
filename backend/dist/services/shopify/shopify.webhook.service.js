import { eventBus } from '../../events/bus.js';
import { supabase } from '../../lib/supabase.js';
import { farmerService } from '../farmer/farmer.service.js';
import { orderWhatsappService } from '../whatsapp/orders/order-whatsapp.service.js';
import { logger } from '../../lib/logger.js';
export const shopifyWebhookService = {
    async handleOrderCreate(order) {
        await this.syncOrder(order);
        await eventBus.publish('shopify.order.created', { shopifyOrderId: String(order.id), orderName: order.name }, 'shopify');
    },
    async handleOrderPaid(order) {
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
            await orderWhatsappService.linkOrderToFarmer(String(order.id), order.phone);
        }
        await eventBus.publish('shopify.order.paid', { shopifyOrderId: String(order.id), orderName: order.name, total: order.total_price }, 'shopify');
    },
    async handleFulfillment(fulfillment) {
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
        const { data: orderRow } = await supabase
            .from('commerce_orders')
            .select('phone, order_name')
            .eq('shopify_order_id', String(fulfillment.order_id))
            .maybeSingle();
        if (fulfillment.tracking_number) {
            await orderWhatsappService.updateOrderTracking({
                shopifyOrderId: String(fulfillment.order_id),
                awb: fulfillment.tracking_number,
                trackingUrl: fulfillment.tracking_url,
                fulfillmentStatus: fulfillment.status,
            });
        }
        if (fulfillment.status === 'success' || fulfillment.status === 'delivered') {
            await eventBus.publish('shopify.order.fulfilled', {
                shopifyOrderId: String(fulfillment.order_id),
                trackingNumber: fulfillment.tracking_number,
                trackingUrl: fulfillment.tracking_url,
                phone: orderRow?.phone,
                orderName: orderRow?.order_name,
            }, 'shopify');
        }
        else if (fulfillment.tracking_number && orderRow?.phone) {
            await eventBus.publish('shipment.dispatched', {
                shopifyOrderId: String(fulfillment.order_id),
                awb: fulfillment.tracking_number,
                phone: orderRow.phone,
                orderName: orderRow.order_name,
            }, 'shopify');
        }
    },
    async syncOrder(order) {
        const isCod = order.tags?.toLowerCase().includes('cod') ||
            order.financial_status === 'pending';
        const { error } = await supabase.from('commerce_orders').upsert({
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
        }, { onConflict: 'shopify_order_id' });
        if (error)
            logger.error({ error, orderId: order.id }, 'Order sync failed');
        else if (order.phone) {
            await orderWhatsappService.linkOrderToFarmer(String(order.id), order.phone);
        }
    },
};
//# sourceMappingURL=shopify.webhook.service.js.map