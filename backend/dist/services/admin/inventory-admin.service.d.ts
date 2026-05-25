export interface InventoryListQuery {
    page?: number;
    limit?: number;
    search?: string;
    status?: 'all' | 'in_stock' | 'low_stock' | 'out_of_stock';
}
export interface InventoryRow {
    productId: string;
    variantId: string;
    title: string;
    imageUrl: string | null;
    variant: string;
    batchNo: string;
    expiryDate: string;
    stock: number;
    status: 'in_stock' | 'low_stock' | 'out_of_stock';
    unitValueInr: number;
}
export declare const inventoryAdminService: {
    list(query: InventoryListQuery): Promise<{
        rows: InventoryRow[];
        stats: {
            totalStockValue: number;
            totalStock: number;
            lowStockProducts: number;
            outOfStockProducts: number;
        };
        pagination: {
            page: number;
            limit: number;
            total: number;
            pages: number;
        };
    }>;
};
//# sourceMappingURL=inventory-admin.service.d.ts.map