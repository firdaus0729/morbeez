/** Domain events — queue-ready payloads for M3 automation */

export type MorbeezEventType =
  | 'shopify.order.created'
  | 'shopify.order.paid'
  | 'shopify.order.fulfilled'
  | 'payment.razorpay.captured'
  | 'payment.razorpay.failed'
  | 'order.payment.failed'
  | 'shipment.created'
  | 'shipment.dispatched'
  | 'shipment.delivered'
  | 'whatsapp.message.received'
  | 'lead.created'
  | 'quotation.requested'
  | 'farmer.upserted'
  | 'advisory.completed'
  | 'advisory.escalated'
  | 'callback.requested';

export interface MorbeezEvent<T = Record<string, unknown>> {
  id: string;
  type: MorbeezEventType;
  occurredAt: string;
  source: string;
  payload: T;
  idempotencyKey?: string;
}

export type EventHandler = (event: MorbeezEvent) => Promise<void>;
