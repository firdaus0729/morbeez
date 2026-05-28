/** Download WhatsApp Cloud API media by ID */
export declare function downloadWhatsAppMedia(mediaId: string): Promise<{
    buffer: Buffer;
    mimeType: string;
}>;
/** Download bytes from a Meta CDN URL (requires the same Bearer token as Graph API). */
export declare function fetchWhatsAppMediaUrl(url: string, fallbackMime?: string): Promise<{
    buffer: Buffer;
    mimeType: string;
}>;
//# sourceMappingURL=whatsapp-media.d.ts.map