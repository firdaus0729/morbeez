import { describe, it, expect } from 'vitest';
import { metaWhatsAppIdempotencyKey } from './meta-whatsapp-webhook.js';
describe('metaWhatsAppIdempotencyKey', () => {
    const baseEntry = {
        id: 'WABA123',
        changes: [
            {
                field: 'messages',
                value: {
                    messaging_product: 'whatsapp',
                    metadata: {
                        display_phone_number: '917676026318',
                        phone_number_id: '1127102317154194',
                    },
                },
            },
        ],
    };
    it('uses different keys for status vs inbound message webhooks', () => {
        const statusPayload = {
            object: 'whatsapp_business_account',
            entry: [
                {
                    ...baseEntry,
                    changes: [
                        {
                            ...baseEntry.changes[0],
                            value: {
                                ...baseEntry.changes[0].value,
                                statuses: [{ id: 'wamid.status.1', status: 'delivered', recipient_id: '916282873542' }],
                            },
                        },
                    ],
                },
            ],
        };
        const messagePayload = {
            object: 'whatsapp_business_account',
            entry: [
                {
                    ...baseEntry,
                    changes: [
                        {
                            ...baseEntry.changes[0],
                            value: {
                                ...baseEntry.changes[0].value,
                                messages: [
                                    {
                                        from: '916282873542',
                                        id: 'wamid.msg.1',
                                        type: 'text',
                                        text: { body: 'Hi' },
                                    },
                                ],
                            },
                        },
                    ],
                },
            ],
        };
        const statusKey = metaWhatsAppIdempotencyKey(statusPayload);
        const messageKey = metaWhatsAppIdempotencyKey(messagePayload);
        expect(statusKey).not.toBe(messageKey);
        expect(messageKey).toBe('msg:wamid.msg.1');
        expect(statusKey).toBe('status:wamid.status.1:delivered');
    });
    it('old truncated stringify would collide for status vs message', () => {
        const statusPayload = {
            entry: [
                {
                    id: 'WABA123',
                    changes: [
                        {
                            value: {
                                messaging_product: 'whatsapp',
                                metadata: {
                                    display_phone_number: '917676026318',
                                    phone_number_id: '1127102317154194',
                                },
                                statuses: [{ id: 'wamid.status.1', status: 'delivered' }],
                            },
                        },
                    ],
                },
            ],
        };
        const messagePayload = {
            entry: [
                {
                    id: 'WABA123',
                    changes: [
                        {
                            value: {
                                messaging_product: 'whatsapp',
                                metadata: {
                                    display_phone_number: '917676026318',
                                    phone_number_id: '1127102317154194',
                                },
                                messages: [{ id: 'wamid.msg.1', from: '916282873542', type: 'text', text: { body: 'Hi' } }],
                            },
                        },
                    ],
                },
            ],
        };
        const oldStatus = JSON.stringify(statusPayload.entry[0]).slice(0, 128);
        const oldMessage = JSON.stringify(messagePayload.entry[0]).slice(0, 128);
        expect(oldStatus).toBe(oldMessage);
    });
});
//# sourceMappingURL=meta-whatsapp-webhook.test.js.map