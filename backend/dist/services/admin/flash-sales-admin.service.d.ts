export type FlashSaleTab = 'all' | 'live' | 'upcoming' | 'completed';
export interface FlashSalesListQuery {
    tab?: FlashSaleTab;
    page?: number;
    limit?: number;
}
export interface CreateFlashSaleInput {
    productName: string;
    imageUrl?: string;
    flashPrice: number;
    originalPrice: number;
    startsAt: string;
    endsAt: string;
    stockTotal: number;
    description?: string;
    shopifyProductId?: string;
}
export declare const flashSalesAdminService: {
    list(query: FlashSalesListQuery): Promise<{
        sales: {
            id: string;
            productName: string;
            imageUrl: string | null;
            flashPrice: number;
            originalPrice: number;
            discount: number;
            discountLabel: string;
            status: "completed" | "upcoming" | "live";
            startsAt: string;
            endsAt: string;
            startLabel: string;
            endLabel: string;
            stockTotal: number;
            stockSold: number;
            stockLeft: number;
            soldPct: number;
            salesMtd: number;
            description: string | null;
            shopifyProductId: string | null;
        }[];
        tabCounts: {
            all: number;
            live: number;
            upcoming: number;
            completed: number;
        };
        stats: {
            activeSales: number;
            upcoming: number;
            completed: number;
            totalSalesMtd: number;
            salesMonthLabel: string;
        };
        pagination: {
            page: number;
            limit: number;
            total: number;
            pages: number;
        };
    }>;
    get(id: string): Promise<{
        id: string;
        productName: string;
        imageUrl: string | null;
        flashPrice: number;
        originalPrice: number;
        discount: number;
        discountLabel: string;
        status: "completed" | "upcoming" | "live";
        startsAt: string;
        endsAt: string;
        startLabel: string;
        endLabel: string;
        stockTotal: number;
        stockSold: number;
        stockLeft: number;
        soldPct: number;
        salesMtd: number;
        description: string | null;
        shopifyProductId: string | null;
    }>;
    create(input: CreateFlashSaleInput): Promise<{
        id: string;
        productName: string;
        imageUrl: string | null;
        flashPrice: number;
        originalPrice: number;
        discount: number;
        discountLabel: string;
        status: "completed" | "upcoming" | "live";
        startsAt: string;
        endsAt: string;
        startLabel: string;
        endLabel: string;
        stockTotal: number;
        stockSold: number;
        stockLeft: number;
        soldPct: number;
        salesMtd: number;
        description: string | null;
        shopifyProductId: string | null;
    }>;
};
//# sourceMappingURL=flash-sales-admin.service.d.ts.map