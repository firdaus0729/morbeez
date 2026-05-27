export type QuickReplyCategory = 'general' | 'telecaller' | 'advisory' | 'orders' | 'broadcast';
export declare const operationsMessagingService: {
    listQuickReplies(category?: string): Promise<any[]>;
    upsertQuickReply(row: {
        id?: string;
        shortcutKey: string;
        category?: QuickReplyCategory;
        labelEn: string;
        bodyEn: string;
        bodyMl?: string;
        bodyTa?: string;
        bodyKn?: string;
        bodyHi?: string;
        active?: boolean;
        sortOrder?: number;
    }): Promise<any>;
    deleteQuickReply(id: string): Promise<void>;
    /** Resolve body for a language (falls back to English). */
    resolveQuickReplyBody(row: {
        body_en: string;
        body_ml?: string | null;
        body_ta?: string | null;
        body_kn?: string | null;
        body_hi?: string | null;
    }, language: string): string;
    listLanguageTemplates(params?: {
        templateKey?: string;
        language?: string;
        status?: string;
    }): Promise<any[]>;
    upsertLanguageTemplate(row: {
        id?: string;
        templateKey: string;
        language: string;
        channel?: "session" | "meta_template";
        bodyText: string;
        headerText?: string;
        footerText?: string;
        metaTemplateName?: string;
        variableHints?: unknown[];
        status?: string;
        active?: boolean;
        notes?: string;
    }): Promise<any>;
    deleteLanguageTemplate(id: string): Promise<void>;
    listAutomationJobs(params: {
        status?: string;
        jobType?: string;
        limit?: number;
        page?: number;
    }): Promise<{
        jobs: any[];
        pagination: {
            page: number;
            limit: number;
            total: number;
            pages: number;
        };
    }>;
    getAutomationStats(): Promise<{
        dueNow: number;
    }>;
    cancelAutomationJob(id: string): Promise<any>;
    retryAutomationJob(id: string): Promise<any>;
};
//# sourceMappingURL=operations-messaging.service.d.ts.map