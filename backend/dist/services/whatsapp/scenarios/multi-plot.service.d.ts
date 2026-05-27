import type { AdvisoryLanguage } from '../../ai/types.js';
export interface FarmerPlot {
    id: string;
    crop_type: string;
    stage: string | null;
    acreage: number | null;
    plot_label: string | null;
    is_primary: boolean | null;
}
export declare const multiPlotService: {
    listPlots(farmerId: string): Promise<FarmerPlot[]>;
    getActivePlotId(farmerId: string): Promise<string | null>;
    setActivePlot(farmerId: string, plot: FarmerPlot): Promise<void>;
    parsePlotSelection(text: string, plots: FarmerPlot[]): FarmerPlot | null;
    analyzeMultiCropMessage(text: string, plots: FarmerPlot[]): {
        needsPlotPicker: boolean;
        cropsMentioned: string[];
        cropsWithIssue: string[];
        cropsOk: string[];
        suggestedPlot: FarmerPlot | null;
    };
    plotSelectPrompt(lang: AdvisoryLanguage): string;
    plotConfirmedMessage(plot: FarmerPlot, lang: AdvisoryLanguage): string;
    buildPlotList(plots: FarmerPlot[], lang: AdvisoryLanguage): {
        body: string;
        buttonText: string;
        sections: {
            title: string;
            rows: {
                id: string;
                title: string;
                description: string | undefined;
            }[];
        }[];
    };
    buildPlotButtons(plots: FarmerPlot[], lang: AdvisoryLanguage): {
        id: string;
        title: string;
    }[];
    requiresPlotSelection(farmerId: string): Promise<boolean>;
};
//# sourceMappingURL=multi-plot.service.d.ts.map