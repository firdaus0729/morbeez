/**
 * Hard-delete a farmer and all CRM / WhatsApp history so the next inbound
 * message creates a brand-new farmer + lead.
 */
export declare const farmerPurgeService: {
    purgeByFarmerId(farmerId: string): Promise<{
        phone: string | null;
    }>;
    purgeByLeadId(leadId: string): Promise<{
        ok: true;
        farmerId: string | null;
        phone: string | null;
    } | {
        ok: false;
    }>;
    purgeByPhone(phone: string): Promise<boolean>;
    purgeRelatedRows(farmerId: string, phone: string | null): Promise<void>;
};
//# sourceMappingURL=farmer-purge.service.d.ts.map