import type { AgricultureInputCategory } from './input-classifier.service.js';
export type VisionPrimaryCategory = 'crop_leaf' | 'disease_symptom' | 'insect' | 'weed' | 'root' | 'soil' | 'fertilizer_bag' | 'pesticide_label' | 'unknown_plant' | 'other';
export type VisionClassification = {
    primaryCategory: VisionPrimaryCategory;
    confidence: number;
    photoQuality: 'ok' | 'blurry' | 'too_dark' | 'unknown';
    hints: string[];
};
export declare const imageInputClassifierService: {
    toAgricultureCategory(vision: VisionClassification): AgricultureInputCategory;
    classifyImage(params: {
        imageBase64: string;
        imageMimeType: string;
        caption?: string;
    }): Promise<VisionClassification | null>;
};
//# sourceMappingURL=image-input-classifier.service.d.ts.map