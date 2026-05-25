export interface ShopifyLinkInfo {
    nextPageInfo: string | null;
    previousPageInfo: string | null;
}
export declare function shopifyAdminRaw(path: string, options?: RequestInit): Promise<{
    data: unknown;
    links: ShopifyLinkInfo;
}>;
export declare function shopifyAdmin<T>(path: string, options?: RequestInit): Promise<T>;
export interface ShopifyOrder {
    id: number;
    name: string;
    email: string | null;
    phone: string | null;
    financial_status: string;
    fulfillment_status: string | null;
    total_price: string;
    currency: string;
    tags: string;
    customer?: {
        id: number;
        phone: string | null;
        first_name: string | null;
    };
    shipping_address?: Record<string, string>;
    line_items: Array<{
        title: string;
        quantity: number;
        sku: string | null;
    }>;
}
export declare function getOrder(orderId: string): Promise<{
    order: ShopifyOrder;
}>;
//# sourceMappingURL=shopify.client.d.ts.map