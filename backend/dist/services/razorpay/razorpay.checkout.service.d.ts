export interface RazorpayOrderCreate {
    amount: number;
    currency?: string;
    receipt: string;
    notes?: Record<string, string>;
}
export interface RazorpayOrderResponse {
    id: string;
    amount: number;
    currency: string;
    receipt: string;
    status: string;
}
export declare const razorpayCheckoutService: {
    getPublicKey(): string;
    createOrder(input: RazorpayOrderCreate): Promise<RazorpayOrderResponse>;
    verifyPaymentSignature(orderId: string, paymentId: string, signature: string): boolean;
};
//# sourceMappingURL=razorpay.checkout.service.d.ts.map