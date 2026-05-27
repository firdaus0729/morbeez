export declare const whatsappOsAdminService: {
    getConversationSession(farmerId: string): Promise<any>;
    updateConversationSession(farmerId: string, patch: {
        aiPaused?: boolean;
        owner?: "ai" | "telecaller" | "agronomist";
        preferredLanguage?: string | null;
    }): Promise<any>;
    listTerminologyReviewTasks(status?: string): Promise<any[]>;
};
//# sourceMappingURL=whatsapp-os-admin.service.d.ts.map