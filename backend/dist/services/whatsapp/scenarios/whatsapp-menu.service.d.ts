import type { AdvisoryLanguage } from '../../ai/types.js';
export type MenuRow = {
    id: string;
    title: string;
    description?: string;
};
/** Primary farmer menu — Crop Assessment, Track Order, Call Back, More. */
export declare function mainMenuCopy(language: AdvisoryLanguage, options?: {
    includeTrackOrder?: boolean;
    welcomeOverride?: string;
    returningQuickActionsOnly?: boolean;
}): {
    welcome: string;
    buttonText: string;
    rows: MenuRow[];
};
/** Secondary menu under More. */
export declare function moreMenuCopy(language: AdvisoryLanguage): {
    body: string;
    buttonText: string;
    rows: MenuRow[];
};
/** Backward-compatible id for crop assessment flows. */
export declare function normalizeMenuId(menuId: string): string;
//# sourceMappingURL=whatsapp-menu.service.d.ts.map