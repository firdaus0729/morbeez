export type OrderStatusTab = 'all' | 'pending' | 'processing' | 'shipped' | 'delivered' | 'cancelled';
export interface OrdersListQuery {
    page?: number;
    limit?: number;
    search?: string;
    status?: OrderStatusTab;
    payment?: 'cod' | 'paid' | '';
}
interface DetailLineItem {
    product: string;
    variant: string;
    mrp: number;
    price: number;
    qty: number;
    total: number;
    isFree: boolean;
}
export declare const ordersAdminService: {
    list(query: OrdersListQuery): Promise<{
        orders: {
            id: string;
            source: "shopify" | "razorpay_checkout";
            shopifyOrderId: string | null;
            orderName: string | null;
            displayOrderId: string;
            farmerName: string;
            email: string | null;
            phone: string | null;
            amount: number;
            currency: string;
            paymentLabel: string;
            status: "pending" | "cancelled" | "processing" | "delivered" | "shipped";
            financialStatus: string | null;
            fulfillmentStatus: string | null;
            createdAt: string;
        }[];
        tabCounts: {
            all: number;
            pending: number;
            processing: number;
            shipped: number;
            delivered: number;
            cancelled: number;
        };
        pagination: {
            page: number;
            limit: number;
            total: number;
            pages: number;
        };
    }>;
    get(id: string): Promise<{
        orderDate: string;
        paymentStatus: string;
        statusLabel: string;
        customer: {
            name: string;
            phone: string | null;
            email: string | null;
            addressShort: string;
        };
        shipping: {
            name: string;
            addressLines: string[];
            courier: string;
            trackingId: string;
        };
        lineItems: DetailLineItem[];
        totals: {
            subtotal: number;
            shipping: number;
            discount: number;
            total: number;
        };
        timeline: {
            key: string;
            label: string;
            at: string | null;
            done: boolean;
            pending: boolean;
        }[];
        notes: string;
        id: string;
        source: "shopify" | "razorpay_checkout";
        shopifyOrderId: string | null;
        orderName: string | null;
        displayOrderId: string;
        farmerName: string;
        email: string | null;
        phone: string | null;
        amount: number;
        currency: string;
        paymentLabel: string;
        status: "pending" | "cancelled" | "processing" | "delivered" | "shipped";
        financialStatus: string | null;
        fulfillmentStatus: string | null;
        createdAt: string;
    }>;
};
export {};
//# sourceMappingURL=orders-admin.service.d.ts.map