import { env } from '../../config/env.js';
import { eventBus } from '../../events/bus.js';
import { supabase } from '../../lib/supabase.js';
import { logger } from '../../lib/logger.js';
import { razorpayRequest, } from './razorpay.client.js';
export const razorpayService = {
    async createPaymentLink(input) {
        if (!env.ENABLE_RAZORPAY_PAYMENT_LINKS) {
            throw new Error('Payment links disabled');
        }
        const body = {
            amount: input.amount,
            currency: input.currency ?? 'INR',
            description: input.description ?? 'Morbeez order payment',
            customer: input.customer,
            notify: input.notify ?? { sms: true, email: false },
            reminder_enable: true,
            notes: {
                ...input.notes,
                quotation_id: input.quotationId ?? '',
                shopify_order_id: input.orderId ?? '',
            },
        };
        const link = await razorpayRequest('/payment_links', {
            method: 'POST',
            body: JSON.stringify(body),
        });
        await supabase.from('payment_events').insert({
            provider: 'razorpay',
            external_id: link.id,
            event_type: 'payment_link.created',
            amount: input.amount / 100,
            currency: body.currency,
            status: link.status,
            metadata: { short_url: link.short_url, notes: body.notes },
        });
        return link;
    },
    async handleWebhook(event, payload) {
        const payment = payload.payload;
        const entity = payment?.payment?.entity;
        if (!entity) {
            logger.warn({ event }, 'Razorpay webhook missing payment entity');
            return;
        }
        const paymentId = String(entity.id ?? '');
        const status = String(entity.status ?? '');
        const amount = Number(entity.amount ?? 0) / 100;
        await supabase.from('payment_events').insert({
            provider: 'razorpay',
            external_id: paymentId,
            event_type: event,
            amount,
            currency: String(entity.currency ?? 'INR'),
            status,
            metadata: entity,
        });
        if (event === 'payment.captured') {
            await eventBus.publish('payment.razorpay.captured', { paymentId, amount, method: entity.method }, 'razorpay');
            const notes = entity.notes;
            if (notes?.shopify_order_id) {
                await supabase
                    .from('commerce_orders')
                    .update({ razorpay_payment_id: paymentId, payment_status: 'paid' })
                    .eq('shopify_order_id', notes.shopify_order_id);
            }
        }
        if (event === 'payment.failed') {
            await eventBus.publish('payment.razorpay.failed', { paymentId, status }, 'razorpay');
        }
    },
};
//# sourceMappingURL=razorpay.service.js.map