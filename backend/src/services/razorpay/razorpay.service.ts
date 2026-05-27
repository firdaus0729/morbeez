import { env } from '../../config/env.js';
import { eventBus } from '../../events/bus.js';
import { supabase } from '../../lib/supabase.js';
import { logger } from '../../lib/logger.js';
import {
  razorpayRequest,
  type PaymentLinkCreate,
  type PaymentLinkResponse,
} from './razorpay.client.js';

export const razorpayService = {
  async createPaymentLink(input: PaymentLinkCreate & { quotationId?: string; orderId?: string }) {
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

    const link = await razorpayRequest<PaymentLinkResponse>('/payment_links', {
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

  async handleWebhook(event: string, payload: Record<string, unknown>): Promise<void> {
    const payment = payload.payload as Record<string, Record<string, unknown>> | undefined;
    const entity = payment?.payment?.entity as Record<string, unknown> | undefined;

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
      await eventBus.publish(
        'payment.razorpay.captured',
        { paymentId, amount, method: entity.method },
        'razorpay'
      );

      const notes = entity.notes as Record<string, string> | undefined;
      if (notes?.shopify_order_id) {
        await supabase
          .from('commerce_orders')
          .update({ razorpay_payment_id: paymentId, payment_status: 'paid' })
          .eq('shopify_order_id', notes.shopify_order_id);
      }
    }

    if (event === 'payment.failed') {
      await eventBus.publish('payment.razorpay.failed', { paymentId, status }, 'razorpay');

      const orderId = entity.order_id != null ? String(entity.order_id) : '';
      if (orderId) {
        const { data: session } = await supabase
          .from('checkout_sessions')
          .select('id, receipt, amount_paise, customer, status')
          .eq('razorpay_order_id', orderId)
          .maybeSingle();

        if (session && session.status !== 'paid') {
          await supabase
            .from('checkout_sessions')
            .update({ status: 'failed', updated_at: new Date().toISOString() })
            .eq('id', session.id);

          const customer = session.customer as { phone?: string } | undefined;
          const phone = customer?.phone?.replace(/\D/g, '');
          if (phone) {
            await eventBus.publish(
              'order.payment.failed',
              {
                phone: phone.length === 10 ? `91${phone}` : phone,
                checkoutSessionId: session.id,
                receipt: session.receipt,
                amountPaise: session.amount_paise,
                razorpayOrderId: orderId,
              },
              'razorpay'
            );
          }
        }
      }
    }
  },
};
