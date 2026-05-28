declare const SUPPORTED: readonly ["ginger", "banana", "cardamom", "pepper", "other"];
type SupportedCrop = (typeof SUPPORTED)[number];
export declare const cropDetectionService: {
    detectFromImage(params: {
        imageBase64: string;
        imageMimeType: string;
        caption?: string;
    }): Promise<{
        crop: SupportedCrop | null;
        confidence: number;
    }>;
};
export {};
//# sourceMappingURL=crop-detection.service.d.ts.map