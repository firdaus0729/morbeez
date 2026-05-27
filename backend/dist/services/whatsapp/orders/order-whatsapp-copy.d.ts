import type { AdvisoryLanguage } from '../../ai/types.js';
export declare function dispatchedMessage(params: {
    lang: AdvisoryLanguage;
    orderName: string;
    trackingId: string;
    expectedDelivery: string;
}): string;
export declare function paymentFailedMessage(params: {
    lang: AdvisoryLanguage;
    orderRef: string;
    amountInr?: string;
}): string;
export declare function trackOrderDetail(params: {
    lang: AdvisoryLanguage;
    orderName: string;
    status: string;
    trackingId?: string;
    trackingUrl?: string;
    expectedDelivery?: string;
}): string;
export declare function retryPaymentHint(lang: AdvisoryLanguage, url: string): string;
export declare function codHint(lang: AdvisoryLanguage, url: string): string;
export declare function noOrderFound(lang: AdvisoryLanguage): string;
//# sourceMappingURL=order-whatsapp-copy.d.ts.map