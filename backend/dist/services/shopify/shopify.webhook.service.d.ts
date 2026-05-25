import type { ShopifyOrder } from './shopify.client.js';
export interface ShopifyFulfillment {
    id: number;
    order_id: number;
    status: string;
    tracking_number?: string;
    tracking_company?: string;
    tracking_url?: string;
}
export declare const shopifyWebhookService: {
    handleOrderCreate(order: ShopifyOrder): Promise<void>;
    handleOrderPaid(order: ShopifyOrder): Promise<void>;
    handleFulfillment(fulfillment: ShopifyFulfillment): Promise<void>;
    syncOrder(order: ShopifyOrder): Promise<void>;
};
//# sourceMappingURL=shopify.webhook.service.d.ts.map