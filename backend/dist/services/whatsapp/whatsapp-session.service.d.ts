/** Farmer messaged business within WhatsApp 24h care window → session (free-text) allowed */
export declare const whatsappSessionService: {
    hasActiveInboundSession(farmerId: string): Promise<boolean>;
    countInboundMessages(farmerId: string): Promise<number>;
    markWelcomeTemplateSent(farmerId: string): Promise<void>;
    shouldSendWelcomeTemplate(farmerId: string): Promise<boolean>;
};
//# sourceMappingURL=whatsapp-session.service.d.ts.map