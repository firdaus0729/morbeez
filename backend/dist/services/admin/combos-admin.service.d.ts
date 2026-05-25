export interface CombosListQuery {
    page?: number;
    limit?: number;
    search?: string;
    status?: 'all' | 'active' | 'inactive';
}
export interface CreateComboInput {
    name: string;
    productCount: number;
    mrp: number;
    comboPrice: number;
    status?: 'active' | 'inactive';
    description?: string;
    products?: Array<{
        title: string;
        quantity?: number;
    }>;
}
export declare const combosAdminService: {
    list(query: CombosListQuery): Promise<{
        combos: {
            id: string;
            name: string;
            productCount: number;
            productsLabel: string;
            mrp: number;
            comboPrice: number;
            discount: number;
            discountLabel: string;
            status: string;
            salesMtd: number;
            description: string | null;
            products: unknown;
        }[];
        stats: {
            total: number;
            active: number;
            inactive: number;
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
        name: string;
        productCount: number;
        productsLabel: string;
        mrp: number;
        comboPrice: number;
        discount: number;
        discountLabel: string;
        status: string;
        salesMtd: number;
        description: string | null;
        products: unknown;
    }>;
    create(input: CreateComboInput): Promise<{
        id: string;
        name: string;
        productCount: number;
        productsLabel: string;
        mrp: number;
        comboPrice: number;
        discount: number;
        discountLabel: string;
        status: string;
        salesMtd: number;
        description: string | null;
        products: unknown;
    }>;
    update(id: string, input: Partial<CreateComboInput>): Promise<{
        id: string;
        name: string;
        productCount: number;
        productsLabel: string;
        mrp: number;
        comboPrice: number;
        discount: number;
        discountLabel: string;
        status: string;
        salesMtd: number;
        description: string | null;
        products: unknown;
    }>;
};
//# sourceMappingURL=combos-admin.service.d.ts.map