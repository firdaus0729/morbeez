export type ImageQualityResult = {
    ok: true;
    contentHash: string;
} | {
    ok: false;
    reason: 'too_small' | 'duplicate' | 'unsupported';
};
export declare function assessImageBuffer(buffer: Buffer, mimeType?: string): ImageQualityResult;
export declare function isDuplicateImage(farmerId: string, contentHash: string): Promise<boolean>;
export declare function recordImageHash(farmerId: string, contentHash: string): Promise<void>;
export declare function imageQualityMessage(language: string, reason: 'too_small' | 'duplicate' | 'unsupported'): string;
//# sourceMappingURL=image-quality.service.d.ts.map