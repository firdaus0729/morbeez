export declare const adminDashboardService: {
    getOverview(): Promise<{
        kpis: {
            farmers: number;
            farmersThisWeek: number;
            farmersTrend: number;
            products: number;
            orders: number;
            ordersTrend: number;
            paidCheckouts: number;
            revenueInr: number;
            revenueTrend: number;
            conversionRate: number;
            conversionTrend: number;
            avgOrderValue: number;
            avgOrderTrend: number;
            aiDiagnoses: number;
            aiDiagnosesWeek: number;
            aiTrend: number;
            compareLabel: string;
        };
        alerts: {
            lowStock: number;
            outOfStock: number;
            expiringSoon: number;
            pendingOrders: number;
        };
        salesChart: {
            labels: string[];
            values: number[];
        };
        topProducts: {
            title: string;
            revenue: number;
            imageUrl: string | null;
        }[];
        lowStock: {
            id: string;
            title: string;
            inventory: number;
            imageUrl: string | null;
        }[];
        recentFarmers: {
            id: any;
            name: any;
            email: any;
            phone: any;
            district: any;
            createdAt: any;
            lastLoginAt: any;
        }[];
        recentOrders: {
            id: any;
            orderName: any;
            email: any;
            phone: any;
            totalAmount: any;
            currency: any;
            financialStatus: any;
            createdAt: any;
        }[];
        recentCheckouts: {
            id: any;
            orderName: any;
            amountInr: number;
            email: string | undefined;
            customerName: string | null;
            createdAt: any;
        }[];
        roadmap: {
            offers: boolean;
            combos: boolean;
            flashSales: boolean;
            aiAdvisory: boolean;
            whatsapp: boolean;
            analytics: boolean;
        };
    }>;
};
//# sourceMappingURL=admin-dashboard.service.d.ts.map