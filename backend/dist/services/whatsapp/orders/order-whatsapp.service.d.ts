import type { AdvisoryLanguage } from '../../ai/types.js';
declare function normalizePhone(phone: string): string;
export declare const orderWhatsappService: {
    normalizePhone: typeof normalizePhone;
    resolveFarmerByPhone(phone: string): Promise<{
        farmerId: string | null;
        language: AdvisoryLanguage;
        phone: string;
    }>;
    linkOrderToFarmer(shopifyOrderId: string, phone?: string | null): Promise<void>;
    alreadyNotified(referenceKey: string): Promise<boolean>;
    recordNotification(params: {
        referenceKey: string;
        eventType: "dispatched" | "payment_failed" | "delivered";
        phone: string;
        farmerId?: string | null;
        commerceOrderId?: string;
        checkoutSessionId?: string;
        metadata?: Record<string, unknown>;
    }): Promise<void>;
    sendDispatched(params: {
        shopifyOrderId: string;
        phone: string;
        orderName?: string;
        trackingAwb?: string;
        trackingUrl?: string;
        expectedDeliveryAt?: string;
    }): Promise<boolean>;
    sendPaymentFailed(params: {
        phone: string;
        checkoutSessionId?: string;
        receipt?: string;
        amountPaise?: number;
        razorpayOrderId?: string;
    }): Promise<boolean>;
    getLatestOrderForPhone(phone: string): Promise<{
        id: any;
        order_name: any;
        shopify_order_id: any;
        payment_status: any;
        fulfillment_status: any;
        tracking_awb: any;
        tracking_url: any;
        expected_delivery_at: any;
        total_amount: any;
        created_at: any;
    } | null>;
    handleInboundAction(params: {
        phone: string;
        farmerId: string | null;
        language: AdvisoryLanguage;
        action: string;
        text?: string;
    }): Promise<boolean>;
    notifyDispatchedFromEvent(payload: {
        shopifyOrderId?: string;
        awb?: string;
        phone?: string;
        orderName?: string;
    }): Promise<void>;
    updateOrderTracking(params: {
        shopifyOrderId: string;
        awb?: string;
        trackingUrl?: string;
        fulfillmentStatus?: string;
    }): Promise<void>;
};
export {};
//# sourceMappingURL=order-whatsapp.service.d.ts.map