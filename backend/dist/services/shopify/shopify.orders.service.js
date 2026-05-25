import { shopifyAdmin } from './shopify.client.js';
export const shopifyOrdersService = {
    async createPaidOrder(input) {
        const shipping = {
            first_name: input.shipping.firstName,
            last_name: input.shipping.lastName,
            address1: input.shipping.address1,
            address2: input.shipping.address2 ?? '',
            city: input.shipping.city,
            province: input.shipping.province,
            zip: input.shipping.zip,
            country: input.shipping.country ?? 'IN',
            phone: input.shipping.phone ?? input.phone ?? '',
        };
        const billing = input.billing ? {
            first_name: input.billing.firstName,
            last_name: input.billing.lastName,
            address1: input.billing.address1,
            address2: input.billing.address2 ?? '',
            city: input.billing.city,
            province: input.billing.province,
            zip: input.billing.zip,
            country: input.billing.country ?? 'IN',
            phone: input.billing.phone ?? input.phone ?? '',
        } : shipping;
        const order = {
            email: input.email,
            phone: input.phone,
            line_items: input.lineItems.map((li) => ({
                variant_id: li.variantId,
                quantity: li.quantity,
            })),
            shipping_address: shipping,
            billing_address: billing,
            financial_status: 'paid',
            send_receipt: true,
            inventory_behaviour: 'decrement_obeying_policy',
            note: input.note ?? `Paid via Razorpay (${input.razorpayPaymentId})`,
            tags: 'razorpay-checkout',
            transactions: [
                {
                    kind: 'sale',
                    status: 'success',
                    amount: input.totalAmountInr,
                    gateway: 'razorpay',
                    authorization: input.razorpayPaymentId,
                },
            ],
        };
        const res = await shopifyAdmin('/orders.json', {
            method: 'POST',
            body: JSON.stringify({ order }),
        });
        return {
            shopifyOrderId: String(res.order.id),
            orderName: res.order.name,
            orderStatusUrl: res.order.order_status_url ?? null,
        };
    },
};
//# sourceMappingURL=shopify.orders.service.js.map