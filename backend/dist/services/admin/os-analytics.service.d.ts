export declare const osAnalyticsService: {
    getSummary(days?: number): Promise<{
        periodDays: number;
        since: string;
        kpis: {
            farmers: number;
            activeFarmers30d: number;
            retentionRate30d: number;
            broadcastsSent: number;
            broadcastFailureRate: number;
            recommendationsTotal: number;
            recommendationSuccessRate: number;
            topDistrict: string;
        };
        geography: {
            periodDays: number;
            districts: {
                intensity: number;
                district: string;
                farmers: number;
                blocks: number;
                recommendations: number;
                broadcastsSent: number;
                broadcastsFailed: number;
                pincodeCount: number;
                activityScore: number;
            }[];
            pincodeFirstNote: string;
        };
        retention: {
            totalFarmers: number;
            active7d: number;
            active30d: number;
            rate7d: number;
            rate30d: number;
            inactive90d: number;
            signupCohortByWeek: {
                label: string;
                signups: number;
            }[];
        };
        broadcasts: {
            periodDays: number;
            totals: {
                sent: number;
                failed: number;
                skipped: number;
                total: number;
                failureRate: number;
            };
            byKind: {
                total: number;
                sent: number;
                failed: number;
                skipped: number;
                kind: string;
            }[];
            dailySent: number[];
            dailyLabels: string[];
        };
        recommendations: {
            periodDays: number;
            totals: {
                created: number;
                approved: number;
                communicated: number;
                withOutcome: number;
                positiveOutcome: number;
                successRate: number;
                approvalRate: number;
            };
            byStatus: {
                status: string;
                count: number;
            }[];
            byOutcome: {
                outcome: string;
                count: number;
            }[];
            bySource: {
                source: string;
                count: number;
            }[];
            funnel: {
                stage: string;
                count: number;
            }[];
        };
    }>;
    getDistrictHeatmap(days?: number): Promise<{
        periodDays: number;
        districts: {
            intensity: number;
            district: string;
            farmers: number;
            blocks: number;
            recommendations: number;
            broadcastsSent: number;
            broadcastsFailed: number;
            pincodeCount: number;
            activityScore: number;
        }[];
        pincodeFirstNote: string;
    }>;
    getPincodeBreakdown(district: string, days?: number): Promise<{
        district: string;
        pincodes: {
            pincode: any;
            village: any;
            taluk: any;
            farmers: number;
            recommendations: number;
        }[];
    }>;
    getRetention(days?: number): Promise<{
        totalFarmers: number;
        active7d: number;
        active30d: number;
        rate7d: number;
        rate30d: number;
        inactive90d: number;
        signupCohortByWeek: {
            label: string;
            signups: number;
        }[];
    }>;
    getBroadcastPerformance(days?: number): Promise<{
        periodDays: number;
        totals: {
            sent: number;
            failed: number;
            skipped: number;
            total: number;
            failureRate: number;
        };
        byKind: {
            total: number;
            sent: number;
            failed: number;
            skipped: number;
            kind: string;
        }[];
        dailySent: number[];
        dailyLabels: string[];
    }>;
    getRecommendationSuccess(days?: number): Promise<{
        periodDays: number;
        totals: {
            created: number;
            approved: number;
            communicated: number;
            withOutcome: number;
            positiveOutcome: number;
            successRate: number;
            approvalRate: number;
        };
        byStatus: {
            status: string;
            count: number;
        }[];
        byOutcome: {
            outcome: string;
            count: number;
        }[];
        bySource: {
            source: string;
            count: number;
        }[];
        funnel: {
            stage: string;
            count: number;
        }[];
    }>;
};
//# sourceMappingURL=os-analytics.service.d.ts.map