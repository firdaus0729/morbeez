export interface FarmerListQuery {
    page?: number;
    limit?: number;
    search?: string;
    status?: 'all' | 'active' | 'inactive';
    state?: string;
}
export declare const farmersAdminService: {
    getStats(): Promise<{
        total: number;
        active: number;
        newThisMonth: number;
        repeatBuyers: number;
    }>;
    list(query: FarmerListQuery): Promise<{
        stats: {
            total: number;
            active: number;
            newThisMonth: number;
            repeatBuyers: number;
        };
        farmers: {
            cropsLabel: string;
            lastOrderAt: string | null;
            orderCount: number;
            status: "active" | "inactive";
            isRepeatBuyer: boolean;
            id: unknown;
            email: unknown;
            phone: unknown;
            firstName: unknown;
            lastName: unknown;
            name: unknown;
            displayName: string;
            initials: string;
            avatarHue: number;
            district: unknown;
            state: unknown;
            source: unknown;
            newsletterSubscribed: unknown;
            lastLoginAt: unknown;
            createdAt: unknown;
            updatedAt: unknown;
        }[];
        pagination: {
            page: number;
            limit: number;
            total: number;
            pages: number;
        };
    }>;
    get(id: string): Promise<{
        farmer: {
            cropsLabel: string;
            lastOrderAt: string | null;
            orderCount: number;
            status: "active" | "inactive";
            isRepeatBuyer: boolean;
            id: unknown;
            email: unknown;
            phone: unknown;
            firstName: unknown;
            lastName: unknown;
            name: unknown;
            displayName: string;
            initials: string;
            avatarHue: number;
            district: unknown;
            state: unknown;
            source: unknown;
            newsletterSubscribed: unknown;
            lastLoginAt: unknown;
            createdAt: unknown;
            updatedAt: unknown;
        };
        crops: string[];
    }>;
    create(input: {
        phone: string;
        name?: string;
        firstName?: string;
        lastName?: string;
        state?: string;
        district?: string;
        crops?: string;
    }): Promise<{
        farmer: {
            cropsLabel: string;
            lastOrderAt: string | null;
            orderCount: number;
            status: "active" | "inactive";
            isRepeatBuyer: boolean;
            id: unknown;
            email: unknown;
            phone: unknown;
            firstName: unknown;
            lastName: unknown;
            name: unknown;
            displayName: string;
            initials: string;
            avatarHue: number;
            district: unknown;
            state: unknown;
            source: unknown;
            newsletterSubscribed: unknown;
            lastLoginAt: unknown;
            createdAt: unknown;
            updatedAt: unknown;
        };
        crops: string[];
    }>;
    update(id: string, patch: {
        firstName?: string;
        lastName?: string;
        phone?: string;
        district?: string;
        state?: string;
        newsletterSubscribed?: boolean;
    }): Promise<{
        cropsLabel: string;
        lastOrderAt: string | null;
        orderCount: number;
        status: "active" | "inactive";
        isRepeatBuyer: boolean;
        id: unknown;
        email: unknown;
        phone: unknown;
        firstName: unknown;
        lastName: unknown;
        name: unknown;
        displayName: string;
        initials: string;
        avatarHue: number;
        district: unknown;
        state: unknown;
        source: unknown;
        newsletterSubscribed: unknown;
        lastLoginAt: unknown;
        createdAt: unknown;
        updatedAt: unknown;
    }>;
    listStates(): Promise<string[]>;
};
//# sourceMappingURL=farmers-admin.service.d.ts.map