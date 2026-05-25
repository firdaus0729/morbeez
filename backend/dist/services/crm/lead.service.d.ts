export declare const leadService: {
    createLead(input: {
        phone: string;
        name?: string;
        intent: "quotation" | "callback" | "support" | "dealer" | "general";
        source: "web" | "whatsapp" | "shopify" | "phone";
        notes?: string;
        cropType?: string;
        district?: string;
    }): Promise<{
        lead: any;
        farmer: any;
    }>;
    listLeads(status?: string, limit?: number): Promise<any[]>;
};
//# sourceMappingURL=lead.service.d.ts.map