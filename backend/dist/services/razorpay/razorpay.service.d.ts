import { type PaymentLinkCreate, type PaymentLinkResponse } from './razorpay.client.js';
export declare const razorpayService: {
    createPaymentLink(input: PaymentLinkCreate & {
        quotationId?: string;
        orderId?: string;
    }): Promise<PaymentLinkResponse>;
    handleWebhook(event: string, payload: Record<string, unknown>): Promise<void>;
};
//# sourceMappingURL=razorpay.service.d.ts.map