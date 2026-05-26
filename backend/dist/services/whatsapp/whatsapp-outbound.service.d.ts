type SendProvider = {
    sendText: (to: string, text: string) => Promise<void>;
    sendTemplate: (to: string, name: string, params: {
        body: string[];
    }) => Promise<void>;
};
export declare const whatsappOutboundService: {
    sendToFarmer(provider: SendProvider, params: {
        phone: string;
        farmerId: string;
        text: string;
        forceTemplate?: boolean;
        templateName?: string;
        templateBodyFields?: string[];
    }): Promise<{
        mode: "session" | "template";
    }>;
    sendWelcomeTemplate(provider: SendProvider, params: {
        phone: string;
        farmerId: string;
        profileName?: string;
    }): Promise<boolean>;
};
export {};
//# sourceMappingURL=whatsapp-outbound.service.d.ts.map