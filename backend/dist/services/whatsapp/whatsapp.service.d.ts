declare function getProvider(): {
    sendText(to: string, text: string): Promise<void>;
    sendTemplate(to: string, templateName: string, params: {
        body: string[];
    }): Promise<void>;
};
/** Ads Gyani Settings → API & Webhook: { contact, message } */
export declare function parseAdsGyaniWebhook(payload: Record<string, unknown>): {
    from: string;
    msgType: string;
    text: string;
    messageId: string;
    profileName?: string;
    messageObject?: Record<string, unknown>;
} | null;
export declare const whatsappService: {
    getProvider: typeof getProvider;
    sendText(to: string, text: string): Promise<void>;
    sendTemplate(to: string, templateName: string, params: {
        body: string[];
    }): Promise<void>;
    sendToFarmer(params: {
        phone: string;
        farmerId: string;
        text: string;
        forceTemplate?: boolean;
        templateName?: string;
        templateBodyFields?: string[];
    }): Promise<{
        mode: "session" | "template";
    }>;
    sendWelcomeTemplate(params: {
        phone: string;
        farmerId: string;
        profileName?: string;
    }): Promise<boolean>;
    handleAdsGyaniInbound(payload: Record<string, unknown>): Promise<void>;
    handleCloudInbound(payload: Record<string, unknown>): Promise<void>;
};
export {};
//# sourceMappingURL=whatsapp.service.d.ts.map