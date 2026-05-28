import type { AdvisoryLanguage } from '../../ai/types.js';
export declare function mainMenuCopy(language: AdvisoryLanguage, options?: {
    includeTrackOrder?: boolean;
    welcomeOverride?: string;
    returningQuickActionsOnly?: boolean;
}): {
    welcome: string;
    buttonText: string;
    rows: Array<{
        id: string;
        title: string;
        description?: string;
    }>;
};
//# sourceMappingURL=whatsapp-menu.service.d.ts.map