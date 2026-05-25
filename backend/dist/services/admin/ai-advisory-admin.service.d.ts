export declare const aiAdvisoryAdminService: {
    getOverview(): Promise<{
        source: "demo";
        kpis: {
            totalDiagnoses: number;
            totalDiagnosesTrend: number;
            successfulRecommendations: number;
            successfulRateTrend: number;
            farmerQueries: number;
            farmerQueriesTrend: number;
            topAccuracy: number;
            accuracyTrend: number;
            compareLabel: string;
        };
        diagnosisTrend: {
            labels: string[];
            diagnoses: number[];
            successRate: number[];
        };
        topSymptoms: {
            label: string;
            count: number;
        }[];
        topCrops: {
            label: string;
            percent: number;
            count: number;
            color: string;
        }[];
        topProducts: {
            label: string;
            count: number;
        }[];
    } | {
        kpis: {
            totalDiagnoses: number;
            totalDiagnosesTrend: number;
            successfulRecommendations: number;
            successfulRateTrend: number;
            farmerQueries: number;
            farmerQueriesTrend: number;
            topAccuracy: number;
            accuracyTrend: number;
            compareLabel: string;
        };
        diagnosisTrend: {
            labels: string[];
            diagnoses: number[];
            successRate: number[];
        };
        topSymptoms: {
            label: string;
            count: number;
        }[];
        topCrops: {
            label: string;
            percent: number;
            count: number;
            color: string;
        }[];
        topProducts: {
            label: string;
            count: number;
        }[];
        source: "mixed";
    } | {
        kpis: {
            totalDiagnoses: number;
            totalDiagnosesTrend: number;
            successfulRecommendations: number;
            successfulRateTrend: number;
            farmerQueries: number;
            farmerQueriesTrend: number;
            topAccuracy: number;
            accuracyTrend: number;
            compareLabel: string;
        };
        diagnosisTrend: {
            labels: string[];
            diagnoses: number[];
            successRate: number[];
        };
        topSymptoms: {
            label: string;
            count: number;
        }[];
        topCrops: {
            label: string;
            count: number;
            percent: number;
            color: string;
        }[];
        topProducts: {
            label: string;
            count: number;
        }[];
        source: "live";
    }>;
    listLogs(query: {
        page?: number;
        limit?: number;
    }): Promise<{
        logs: {
            id: any;
            farmerName: string;
            cropType: string;
            channel: any;
            status: any;
            issue: string;
            confidence: number | null;
            createdAt: any;
        }[];
        pagination: {
            page: number;
            limit: number;
            total: number;
            pages: number;
        };
    }>;
};
//# sourceMappingURL=ai-advisory-admin.service.d.ts.map