export interface CheckoutLineInput {
    variantId: number;
    quantity: number;
    title?: string;
    price: number;
}
export interface CheckoutCustomerInput {
    email: string;
    phone: string;
    firstName: string;
    lastName: string;
    newsletter?: boolean;
}
export interface CheckoutShippingInput {
    address1: string;
    address2?: string;
    city: string;
    province: string;
    zip: string;
    country?: string;
}
export interface CreateCheckoutInput {
    lineItems: CheckoutLineInput[];
    customer: CheckoutCustomerInput;
    shipping: CheckoutShippingInput;
}
export declare const checkoutService: {
    createRazorpayCheckout(input: CreateCheckoutInput): Promise<{
        sessionId: `${string}-${string}-${string}-${string}-${string}`;
        razorpayOrderId: string;
        amount: number;
        currency: string;
        keyId: string;
        prefill: {
            name: string;
            email: string;
            contact: string;
        };
    }>;
    verifyAndComplete(input: {
        razorpayOrderId: string;
        razorpayPaymentId: string;
        razorpaySignature: string;
    }): Promise<{
        alreadyCompleted: boolean;
        shopifyOrderId: any;
        orderName: any;
        orderStatusUrl?: undefined;
    } | {
        alreadyCompleted: boolean;
        shopifyOrderId: string;
        orderName: string;
        orderStatusUrl: string | null;
    }>;
};
//# sourceMappingURL=checkout.service.d.ts.map