import type { AdvisoryLanguage } from '../../ai/types.js';
type CropPickerSenders = {
    text: (phone: string, text: string) => Promise<void>;
    list?: (params: {
        phone: string;
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
    }) => Promise<void>;
    buttons?: (params: {
        phone: string;
        body: string;
        buttons: Array<{
            id: string;
            title: string;
        }>;
    }) => Promise<void>;
};
export declare const DEFAULT_CROP_KEYS: readonly ["ginger", "banana", "cardamom", "pepper"];
export type CropPickResult = {
    kind: 'default';
    slug: string;
} | {
    kind: 'custom';
    slug: string;
    label: string;
} | {
    kind: 'other';
} | null;
declare function normalizeSlug(raw: string): string;
declare function displayLabel(raw: string): string;
declare function plotTitle(label: string): string;
export declare const cropSelectionService: {
    normalizeSlug: typeof normalizeSlug;
    displayLabel: typeof displayLabel;
    plotTitle: typeof plotTitle;
    getCustomCrops(farmerId: string): Promise<Array<{
        slug: string;
        label: string;
    }>>;
    registerCustomCrop(farmerId: string, cropName: string): Promise<{
        slug: string;
        label: string;
    }>;
    buildMenuRows(customCrops: Array<{
        slug: string;
        label: string;
    }>): Array<{
        id: string;
        title: string;
        description?: string;
    }>;
    parseSelection(text: string): CropPickResult;
    resolveSelection(farmerId: string, text: string): Promise<CropPickResult>;
    applyCropToPrimaryBlock(farmerId: string, slug: string, label?: string): Promise<void>;
    sendCropPicker(params: {
        farmerId: string;
        phone: string;
        language: AdvisoryLanguage;
        send: CropPickerSenders;
        body?: string;
    }): Promise<void>;
    customCropPrompt(language: AdvisoryLanguage): string;
};
export {};
//# sourceMappingURL=crop-selection.service.d.ts.map