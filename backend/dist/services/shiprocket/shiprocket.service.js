import { eventBus } from '../../events/bus.js';
import { supabase } from '../../lib/supabase.js';
import { getOrder } from '../shopify/shopify.client.js';
import { shiprocketRequest } from './shiprocket.client.js';
import { logger } from '../../lib/logger.js';
/** Delhivery is assigned via Shiprocket courier rules — no separate API in M2 */
export const shiprocketService = {
    async createShipmentForShopifyOrder(shopifyOrderId) {
        const { order } = await getOrder(shopifyOrderId);
        const addr = order.shipping_address;
        if (!addr) {
            logger.warn({ shopifyOrderId }, 'No shipping address — skip shipment');
            return;
        }
        const payload = {
            order_id: order.name,
            order_date: new Date().toISOString().slice(0, 10),
            pickup_location: 'Primary',
            billing_customer_name: addr.first_name ?? 'Customer',
            billing_last_name: addr.last_name ?? '',
            billing_address: addr.address1,
            billing_city: addr.city,
            billing_pincode: addr.zip,
            billing_state: addr.province,
            billing_country: addr.country ?? 'India',
            billing_phone: order.phone ?? addr.phone,
            shipping_is_billing: true,
            order_items: order.line_items.map((li) => ({
                name: li.title,
                sku: li.sku ?? 'SKU',
                units: li.quantity,
                selling_price: 0,
            })),
            payment_method: order.financial_status === 'paid' ? 'Prepaid' : 'COD',
            sub_total: parseFloat(order.total_price),
            length: 10,
            breadth: 10,
            height: 10,
            weight: 0.5,
        };
        const result = await shiprocketRequest('/v1/external/orders/create/adhoc', { method: 'POST', body: JSON.stringify(payload) });
        const awb = result.awb_code ?? null;
        await supabase.from('shipment_events').insert({
            shopify_order_id: shopifyOrderId,
            provider: 'shiprocket',
            shipment_id: String(result.shipment_id),
            awb,
            status: 'created',
            courier: 'auto',
            raw_payload: result,
        });
        const { data: orderRow } = await supabase
            .from('commerce_orders')
            .select('phone, order_name')
            .eq('shopify_order_id', shopifyOrderId)
            .maybeSingle();
        await eventBus.publish('shipment.created', {
            shopifyOrderId,
            shipmentId: result.shipment_id,
            awb,
            phone: orderRow?.phone ?? order.phone,
            orderName: orderRow?.order_name ?? order.name,
        }, 'shiprocket');
    },
    async handleTrackingWebhook(body) {
        const awb = String(body.awb ?? '');
        const status = String(body.current_status ?? body.shipment_status ?? 'unknown');
        const orderId = body.order_id != null ? String(body.order_id) : undefined;
        await supabase.from('shipment_events').insert({
            shopify_order_id: orderId,
            provider: 'shiprocket',
            awb,
            status,
            event_type: 'tracking.update',
            raw_payload: body,
        });
        if (orderId) {
            await supabase
                .from('commerce_orders')
                .update({
                tracking_awb: awb || undefined,
                fulfillment_status: status,
                updated_at: new Date().toISOString(),
            })
                .eq('shopify_order_id', orderId);
        }
        else if (awb) {
            await supabase
                .from('commerce_orders')
                .update({
                tracking_awb: awb,
                fulfillment_status: status,
                updated_at: new Date().toISOString(),
            })
                .eq('tracking_awb', awb);
        }
        const statusLower = status.toLowerCase();
        if (/pick|ship|dispatch|out for delivery|in transit|transit/.test(statusLower) &&
            !statusLower.includes('delivered')) {
            await eventBus.publish('shipment.dispatched', { awb, status, shopifyOrderId: orderId }, 'shiprocket');
        }
        if (statusLower.includes('delivered')) {
            await eventBus.publish('shipment.delivered', { awb, status, shopifyOrderId: orderId }, 'shiprocket');
        }
    },
};
//# sourceMappingURL=shiprocket.service.js.map