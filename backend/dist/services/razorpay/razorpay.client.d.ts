export declare function razorpayRequest<T>(path: string, init?: RequestInit): Promise<T>;
export interface PaymentLinkCreate {
    amount: number;
    currency?: string;
    description?: string;
    customer: {
        name?: string;
        contact: string;
        email?: string;
    };
    notify?: {
        sms?: boolean;
        email?: boolean;
    };
    reminder_enable?: boolean;
    notes?: Record<string, string>;
}
export interface PaymentLinkResponse {
    id: string;
    short_url: string;
    status: string;
}
//# sourceMappingURL=razorpay.client.d.ts.map