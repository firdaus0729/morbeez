export interface WhatsAppProvider {
    sendText(to: string, text: string): Promise<void>;
    sendTemplate(to: string, name: string, params: {
        body: string[];
    }): Promise<void>;
    /** Optional: WhatsApp interactive list (Cloud API supports). */
    sendList?: (params: {
        to: string;
        header?: string;
        body: string;
        buttonText: string;
        sections: Array<{
            title: string;
            rows: Array<{
                id: string;
                title: string;
                description?: string;
            }>;
        }>;
    }) => Promise<void>;
}
//# sourceMappingURL=whatsapp-outbound.types.d.ts.map