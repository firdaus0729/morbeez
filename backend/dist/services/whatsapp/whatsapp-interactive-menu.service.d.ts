/** WhatsApp reply buttons (interactive type "button") — max 3 per message. */
export declare const WHATSAPP_MAX_REPLY_BUTTONS = 3;
export declare const WHATSAPP_BUTTON_TITLE_MAX = 20;
export type ReplyButtonOption = {
    id: string;
    title: string;
};
export declare function fitButtonTitle(title: string, max?: number): string;
/**
 * Sends menu options as visible reply buttons (not list/select).
 * More than 3 options are split across multiple messages (e.g. 5 languages → 3 + 2).
 */
export declare function sendReplyButtonMenu(params: {
    to: string;
    body: string;
    options: ReplyButtonOption[];
    continuationBody?: string;
    sendButtons: (p: {
        to: string;
        body: string;
        buttons: ReplyButtonOption[];
    }) => Promise<void>;
}): Promise<void>;
//# sourceMappingURL=whatsapp-interactive-menu.service.d.ts.map