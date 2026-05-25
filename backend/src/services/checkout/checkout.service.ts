import { randomUUID } from 'crypto';
import { supabase } from '../../lib/supabase.js';
import { throwIfSupabaseError } from '../../lib/supabase-errors.js';
import { NotFoundError, UnauthorizedError, ValidationError } from '../../lib/errors.js';
import { razorpayCheckoutService } from '../razorpay/razorpay.checkout.service.js';
import { shopifyOrdersService } from '../shopify/shopify.orders.service.js';

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

function paiseTotal(lineItems: CheckoutLineInput[]): number {
  let total = 0;
  for (const li of lineItems) {
    if (!li.variantId || li.quantity < 1) {
      throw new ValidationError('Invalid cart line item');
    }
    total += Math.round(li.price) * li.quantity;
  }
  return total;
}

export const checkoutService = {
  async createRazorpayCheckout(input: CreateCheckoutInput) {
    const amountPaise = paiseTotal(input.lineItems);
    const sessionId = randomUUID();
    const receipt = `mbz_${sessionId.replace(/-/g, '').slice(0, 18)}`;

    const rzOrder = await razorpayCheckoutService.createOrder({
      amount: amountPaise,
      currency: 'INR',
      receipt,
      notes: { checkout_session_id: sessionId },
    });

    const { error } = await supabase.from('checkout_sessions').insert({
      id: sessionId,
      razorpay_order_id: rzOrder.id,
      receipt,
      amount_paise: amountPaise,
      currency: 'INR',
      line_items: input.lineItems,
      customer: input.customer,
      shipping: input.shipping,
      status: 'pending',
    });
    throwIfSupabaseError(error, 'Could not start checkout');

    return {
      sessionId,
      razorpayOrderId: rzOrder.id,
      amount: amountPaise,
      currency: 'INR',
      keyId: razorpayCheckoutService.getPublicKey(),
      prefill: {
        name: `${input.customer.firstName} ${input.customer.lastName}`.trim(),
        email: input.customer.email,
        contact: input.customer.phone.replace(/\D/g, '').slice(-10),
      },
    };
  },

  async verifyAndComplete(input: {
    razorpayOrderId: string;
    razorpayPaymentId: string;
    razorpaySignature: string;
  }) {
    if (
      !razorpayCheckoutService.verifyPaymentSignature(
        input.razorpayOrderId,
        input.razorpayPaymentId,
        input.razorpaySignature
      )
    ) {
      throw new UnauthorizedError('Payment verification failed');
    }

    const { data: session, error } = await supabase
      .from('checkout_sessions')
      .select('*')
      .eq('razorpay_order_id', input.razorpayOrderId)
      .single();

    throwIfSupabaseError(error, 'Checkout session not found');
    if (!session) throw new NotFoundError('Checkout session not found');

    if (session.status === 'paid' && session.shopify_order_id) {
      return {
        alreadyCompleted: true,
        shopifyOrderId: session.shopify_order_id,
        orderName: session.shopify_order_name,
      };
    }

    const customer = session.customer as CheckoutCustomerInput;
    const shipping = session.shipping as CheckoutShippingInput;
    const lineItems = session.line_items as CheckoutLineInput[];

    const totalInr = (session.amount_paise / 100).toFixed(2);

    const shopifyOrder = await shopifyOrdersService.createPaidOrder({
      email: customer.email,
      phone: customer.phone,
      lineItems: lineItems.map((li) => ({
        variantId: li.variantId,
        quantity: li.quantity,
        title: li.title,
      })),
      shipping: {
        firstName: customer.firstName,
        lastName: customer.lastName,
        address1: shipping.address1,
        address2: shipping.address2,
        city: shipping.city,
        province: shipping.province,
        zip: shipping.zip,
        country: shipping.country ?? 'IN',
        phone: customer.phone,
      },
      totalAmountInr: totalInr,
      razorpayPaymentId: input.razorpayPaymentId,
      razorpayOrderId: input.razorpayOrderId,
    });

    await supabase
      .from('checkout_sessions')
      .update({
        status: 'paid',
        razorpay_payment_id: input.razorpayPaymentId,
        shopify_order_id: shopifyOrder.shopifyOrderId,
        shopify_order_name: shopifyOrder.orderName,
        updated_at: new Date().toISOString(),
      })
      .eq('id', session.id);

    await supabase.from('payment_events').insert({
      provider: 'razorpay',
      external_id: input.razorpayPaymentId,
      event_type: 'checkout.payment.captured',
      amount: session.amount_paise / 100,
      currency: 'INR',
      status: 'captured',
      metadata: {
        checkout_session_id: session.id,
        shopify_order_id: shopifyOrder.shopifyOrderId,
      },
    });

    return {
      alreadyCompleted: false,
      shopifyOrderId: shopifyOrder.shopifyOrderId,
      orderName: shopifyOrder.orderName,
      orderStatusUrl: shopifyOrder.orderStatusUrl,
    };
  },
};
