import { env } from '../../../config/env.js';
import { supabase } from '../../../lib/supabase.js';
import { logger } from '../../../lib/logger.js';
import { farmerService } from '../../farmer/farmer.service.js';
import { whatsappService } from '../whatsapp.service.js';
import { callbackFlowService } from '../scenarios/callback-flow.service.js';
import { conversationSessionService } from '../conversation-session.service.js';
import { cultivationLoggingService } from '../cultivation/cultivation-logging.service.js';
import type { AdvisoryLanguage } from '../../ai/types.js';
import {
  codHint,
  dispatchedMessage,
  noOrderFound,
  paymentFailedMessage,
  retryPaymentHint,
  trackOrderDetail,
} from './order-whatsapp-copy.js';

function normalizePhone(phone: string): string {
  const d = phone.replace(/\D/g, '');
  if (d.length === 10) return `91${d}`;
  return d;
}

function formatExpectedDelivery(date?: string | null): string {
  if (date) {
    return new Intl.DateTimeFormat('en-IN', {
      timeZone: 'Asia/Kolkata',
      weekday: 'short',
      month: 'short',
      day: 'numeric',
    }).format(new Date(date));
  }
  const tomorrow = new Date();
  tomorrow.setDate(tomorrow.getDate() + 1);
  return new Intl.DateTimeFormat('en-IN', {
    timeZone: 'Asia/Kolkata',
    weekday: 'long',
  }).format(tomorrow);
}

function storefrontUrl(path = ''): string {
  const base = (env.SHOPIFY_STOREFRONT_URL ?? 'https://morbeez.myshopify.com').replace(/\/$/, '');
  return `${base}${path}`;
}

function displayTrackingId(order: {
  order_name?: string | null;
  tracking_awb?: string | null;
  shopify_order_id?: string;
}): string {
  if (order.tracking_awb) return order.tracking_awb;
  if (order.order_name) return order.order_name.replace('#', 'MBZ');
  return `MBZ${String(order.shopify_order_id ?? '').slice(-6)}`;
}

export const orderWhatsappService = {
  normalizePhone,

  async resolveFarmerByPhone(phone: string): Promise<{
    farmerId: string | null;
    language: AdvisoryLanguage;
    phone: string;
  }> {
    const normalized = normalizePhone(phone);
    const { data: farmer } = await supabase
      .from('farmers')
      .select('id, preferred_language')
      .eq('phone', normalized)
      .maybeSingle();

    if (!farmer) {
      const last10 = normalized.slice(-10);
      const { data: alt } = await supabase
        .from('farmers')
        .select('id, preferred_language, phone')
        .ilike('phone', `%${last10}`)
        .limit(1)
        .maybeSingle();
      if (alt) {
        return {
          farmerId: alt.id,
          language: (alt.preferred_language ?? 'en') as AdvisoryLanguage,
          phone: alt.phone ?? normalized,
        };
      }
      return { farmerId: null, language: 'en', phone: normalized };
    }

    return {
      farmerId: farmer.id,
      language: (farmer.preferred_language ?? 'en') as AdvisoryLanguage,
      phone: normalized,
    };
  },

  async linkOrderToFarmer(shopifyOrderId: string, phone?: string | null): Promise<void> {
    if (!phone) return;
    const { farmerId } = await this.resolveFarmerByPhone(phone);
    if (!farmerId) return;
    await supabase
      .from('commerce_orders')
      .update({ farmer_id: farmerId, updated_at: new Date().toISOString() })
      .eq('shopify_order_id', shopifyOrderId);
  },

  async alreadyNotified(referenceKey: string): Promise<boolean> {
    const { data } = await supabase
      .from('whatsapp_order_notifications')
      .select('id')
      .eq('reference_key', referenceKey)
      .maybeSingle();
    return Boolean(data);
  },

  async recordNotification(params: {
    referenceKey: string;
    eventType: 'dispatched' | 'payment_failed' | 'delivered';
    phone: string;
    farmerId?: string | null;
    commerceOrderId?: string;
    checkoutSessionId?: string;
    metadata?: Record<string, unknown>;
  }): Promise<void> {
    await supabase.from('whatsapp_order_notifications').insert({
      reference_key: params.referenceKey,
      event_type: params.eventType,
      phone: params.phone,
      farmer_id: params.farmerId ?? null,
      commerce_order_id: params.commerceOrderId ?? null,
      checkout_session_id: params.checkoutSessionId ?? null,
      metadata: params.metadata ?? {},
    });
  },

  async sendDispatched(params: {
    shopifyOrderId: string;
    phone: string;
    orderName?: string;
    trackingAwb?: string;
    trackingUrl?: string;
    expectedDeliveryAt?: string;
  }): Promise<boolean> {
    const referenceKey = `dispatched:${params.shopifyOrderId}`;
    if (await this.alreadyNotified(referenceKey)) return false;

    const { farmerId, language, phone } = await this.resolveFarmerByPhone(params.phone);

    const { data: order } = await supabase
      .from('commerce_orders')
      .select('id, order_name, tracking_awb, tracking_url, expected_delivery_at, shopify_order_id')
      .eq('shopify_order_id', params.shopifyOrderId)
      .maybeSingle();

    const trackingId = params.trackingAwb ?? order?.tracking_awb ?? displayTrackingId(order ?? { shopify_order_id: params.shopifyOrderId, order_name: params.orderName });
    const expectedDelivery = formatExpectedDelivery(
      params.expectedDeliveryAt ?? order?.expected_delivery_at
    );
    const orderName = params.orderName ?? order?.order_name ?? `#${params.shopifyOrderId}`;

    const body = dispatchedMessage({
      lang: language,
      orderName,
      trackingId,
      expectedDelivery,
    });

    try {
      await whatsappService.sendButtons({
        to: phone,
        body,
        buttons: [
          { id: 'order.track', title: 'Track Order' },
          { id: 'order.help', title: 'Help' },
        ],
      });
    } catch {
      await whatsappService.sendText(phone, `${body}\n\nReply *Track* or *Help*`);
    }

    await this.recordNotification({
      referenceKey,
      eventType: 'dispatched',
      phone,
      farmerId,
      commerceOrderId: order?.id,
      metadata: { shopifyOrderId: params.shopifyOrderId, trackingId },
    });

    if (farmerId) {
      await farmerService
        .logInteraction(farmerId, 'whatsapp', 'outbound', `[order:dispatched] ${orderName}`)
        .catch(() => {});

      const { data: orderRow } = await supabase
        .from('commerce_orders')
        .select('id')
        .eq('shopify_order_id', params.shopifyOrderId)
        .maybeSingle();

      await cultivationLoggingService
        .onOrderDispatched({
          farmerId,
          commerceOrderId: orderRow?.id,
          language,
        })
        .catch(() => {});
    }

    return true;
  },

  async sendPaymentFailed(params: {
    phone: string;
    checkoutSessionId?: string;
    receipt?: string;
    amountPaise?: number;
    razorpayOrderId?: string;
  }): Promise<boolean> {
    const referenceKey = params.checkoutSessionId
      ? `payment_failed:${params.checkoutSessionId}`
      : `payment_failed:${params.razorpayOrderId ?? params.phone}:${Date.now().toString().slice(0, 10)}`;

    if (await this.alreadyNotified(referenceKey)) return false;

    const { farmerId, language, phone } = await this.resolveFarmerByPhone(params.phone);
    const orderRef = params.receipt ?? params.checkoutSessionId?.slice(0, 8) ?? 'Checkout';
    const amountInr =
      params.amountPaise != null ? `₹${(params.amountPaise / 100).toFixed(0)}` : undefined;

    const body = paymentFailedMessage({ lang: language, orderRef, amountInr });

    try {
      await whatsappService.sendButtons({
        to: phone,
        body,
        buttons: [
          { id: 'pay.retry', title: 'Retry Payment' },
          { id: 'pay.cod', title: 'COD' },
          { id: 'order.help', title: 'Help' },
        ],
      });
    } catch {
      await whatsappService.sendText(phone, `${body}\n\nReply *Retry*, *COD*, or *Help*`);
    }

    await this.recordNotification({
      referenceKey,
      eventType: 'payment_failed',
      phone,
      farmerId,
      checkoutSessionId: params.checkoutSessionId,
      metadata: { razorpayOrderId: params.razorpayOrderId, receipt: params.receipt },
    });

    if (params.checkoutSessionId && farmerId) {
      await conversationSessionService.ensureWhatsAppSession(farmerId);
      await conversationSessionService.patchContext(farmerId, {
        pendingCheckoutSessionId: params.checkoutSessionId,
        pendingRazorpayOrderId: params.razorpayOrderId,
      });
    }

    return true;
  },

  async getLatestOrderForPhone(phone: string) {
    const normalized = normalizePhone(phone);
    const last10 = normalized.slice(-10);
    const { data } = await supabase
      .from('commerce_orders')
      .select(
        'id, order_name, shopify_order_id, payment_status, fulfillment_status, tracking_awb, tracking_url, expected_delivery_at, total_amount, created_at'
      )
      .or(`phone.eq.${normalized},phone.ilike.%${last10}`)
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle();
    return data;
  },

  async handleInboundAction(params: {
    phone: string;
    farmerId: string | null;
    language: AdvisoryLanguage;
    action: string;
    text?: string;
  }): Promise<boolean> {
    const { phone, farmerId, language, action } = params;

    if (action === 'order.help' || /^help$/i.test(action)) {
      const msg = farmerId
        ? await callbackFlowService.createCallback(farmerId, language, 'Order help — WhatsApp')
        : 'Our team will contact you shortly.';
      await whatsappService.sendText(phone, msg);
      return true;
    }

    if (action === 'order.track' || /^track/i.test(action) || /order status/i.test(params.text ?? '')) {
      const order = await this.getLatestOrderForPhone(phone);
      if (!order) {
        await whatsappService.sendText(phone, noOrderFound(language));
        return true;
      }

      const status = [order.payment_status, order.fulfillment_status].filter(Boolean).join(' · ') || 'Processing';
      const detail = trackOrderDetail({
        lang: language,
        orderName: order.order_name ?? 'Your order',
        status,
        trackingId: order.tracking_awb ?? displayTrackingId(order),
        trackingUrl: order.tracking_url ?? undefined,
        expectedDelivery: order.expected_delivery_at
          ? formatExpectedDelivery(order.expected_delivery_at)
          : undefined,
      });
      await whatsappService.sendText(phone, detail);
      return true;
    }

    if (action === 'pay.retry' || /^retry/i.test(action)) {
      let sessionId: string | undefined;
      if (farmerId) {
        const ctx = await conversationSessionService.getContext(farmerId);
        sessionId = ctx.pendingCheckoutSessionId;
      }
      const checkoutUrl = sessionId
        ? `${storefrontUrl('/pages/checkout')}?session=${sessionId}`
        : storefrontUrl('/cart');
      await whatsappService.sendText(phone, retryPaymentHint(language, checkoutUrl));
      return true;
    }

    if (action === 'pay.cod' || /^cod$/i.test(action)) {
      await whatsappService.sendText(phone, codHint(language, storefrontUrl('/collections/all')));
      return true;
    }

    return false;
  },

  async notifyDispatchedFromEvent(payload: {
    shopifyOrderId?: string;
    awb?: string;
    phone?: string;
    orderName?: string;
  }): Promise<void> {
    let shopifyOrderId = payload.shopifyOrderId;
    let phone = payload.phone;
    let orderName = payload.orderName;

    if (!phone && shopifyOrderId) {
      const { data: order } = await supabase
        .from('commerce_orders')
        .select('phone, order_name, shopify_order_id')
        .eq('shopify_order_id', shopifyOrderId)
        .maybeSingle();
      phone = order?.phone ?? undefined;
      orderName = orderName ?? order?.order_name ?? undefined;
    }

    if (!phone && payload.awb) {
      const { data: order } = await supabase
        .from('commerce_orders')
        .select('phone, order_name, shopify_order_id')
        .eq('tracking_awb', payload.awb)
        .maybeSingle();
      phone = order?.phone ?? undefined;
      shopifyOrderId = shopifyOrderId ?? order?.shopify_order_id ?? undefined;
      orderName = orderName ?? order?.order_name ?? undefined;
    }

    if (!phone || !shopifyOrderId) {
      logger.warn({ payload }, 'Dispatch WhatsApp skipped — no phone/order');
      return;
    }

    await this.updateOrderTracking({
      shopifyOrderId,
      awb: payload.awb,
    });

    await this.sendDispatched({
      shopifyOrderId,
      phone,
      orderName,
      trackingAwb: payload.awb,
    });
  },

  async updateOrderTracking(params: {
    shopifyOrderId: string;
    awb?: string;
    trackingUrl?: string;
    fulfillmentStatus?: string;
  }): Promise<void> {
    const expected = new Date();
    expected.setDate(expected.getDate() + 1);

    await supabase
      .from('commerce_orders')
      .update({
        tracking_awb: params.awb ?? undefined,
        tracking_url: params.trackingUrl ?? undefined,
        fulfillment_status: params.fulfillmentStatus ?? undefined,
        expected_delivery_at: expected.toISOString(),
        updated_at: new Date().toISOString(),
      })
      .eq('shopify_order_id', params.shopifyOrderId);
  },
};
