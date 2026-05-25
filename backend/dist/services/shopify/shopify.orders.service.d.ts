export interface CheckoutLineItem {
    variantId: number;
    quantity: number;
    title?: string;
}
export interface CheckoutAddress {
    firstName: string;
    lastName: string;
    address1: string;
    address2?: string;
    city: string;
    province: string;
    zip: string;
    country?: string;
    phone?: string;
}
export interface CreatePaidOrderInput {
    email: string;
    phone?: string;
    lineItems: CheckoutLineItem[];
    shipping: CheckoutAddress;
    billing?: CheckoutAddress;
    totalAmountInr: string;
    razorpayPaymentId: string;
    razorpayOrderId: string;
    note?: string;
}
export declare const shopifyOrdersService: {
    createPaidOrder(input: CreatePaidOrderInput): Promise<{
        shopifyOrderId: string;
        orderName: string;
        orderStatusUrl: string | null;
    }>;
};
//# sourceMappingURL=shopify.orders.service.d.ts.map