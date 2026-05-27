export declare const cloudWhatsAppProvider: {
    sendText(to: string, text: string): Promise<void>;
    sendTemplate(to: string, templateName: string, params: {
        body: string[];
    }): Promise<void>;
    /** Interactive list (use for >3 options like language selection/menu). */
    sendList(params: {
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
    }): Promise<void>;
    /** Quick-reply buttons (max 3). */
    sendButtons(params: {
        to: string;
        body: string;
        buttons: Array<{
            id: string;
            title: string;
        }>;
    }): Promise<void>;
};
//# sourceMappingURL=cloud.provider.d.ts.map