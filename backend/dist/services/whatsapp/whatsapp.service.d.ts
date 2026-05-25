export declare const whatsappService: {
    sendText(to: string, text: string): Promise<void>;
    sendTemplate(to: string, templateName: string, params: {
        body: string[];
    }): Promise<void>;
    handleCloudInbound(payload: Record<string, unknown>): Promise<void>;
    handleCropDoctorMedia(farmerId: string, phone: string, msg: Record<string, unknown>, msgType: string, language: string): Promise<void>;
    classifyAndCreateLead(farmerId: string, text: string): Promise<void>;
};
//# sourceMappingURL=whatsapp.service.d.ts.map