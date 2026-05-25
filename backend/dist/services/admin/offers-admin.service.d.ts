export type OfferTab = 'all' | 'active' | 'upcoming' | 'expired';
export interface OfferListQuery {
    tab?: OfferTab;
}
export interface CreateOfferInput {
    name: string;
    offerType: 'percentage' | 'combo' | 'flat';
    discountLabel: string;
    minOrderAmount: number;
    startsAt: string;
    endsAt: string;
    description?: string;
}
export interface CreateCouponInput {
    code: string;
    discountLabel: string;
    minOrderAmount: number;
    usageLimit: number;
    validUntil: string;
}
export declare const offersAdminService: {
    listOffers(query: OfferListQuery): Promise<{
        offers: {
            id: string;
            name: string;
            type: string;
            offerType: string;
            discount: string;
            minOrder: number;
            validity: string;
            startsAt: string;
            endsAt: string;
            status: "active" | "upcoming" | "expired";
            description: string | null;
        }[];
        tabCounts: {
            all: number;
            active: number;
            upcoming: number;
            expired: number;
        };
    }>;
    getOffer(id: string): Promise<{
        id: string;
        name: string;
        type: string;
        offerType: string;
        discount: string;
        minOrder: number;
        validity: string;
        startsAt: string;
        endsAt: string;
        status: "active" | "upcoming" | "expired";
        description: string | null;
    }>;
    createOffer(input: CreateOfferInput): Promise<{
        id: string;
        name: string;
        type: string;
        offerType: string;
        discount: string;
        minOrder: number;
        validity: string;
        startsAt: string;
        endsAt: string;
        status: "active" | "upcoming" | "expired";
        description: string | null;
    }>;
    listCoupons(): Promise<{
        coupons: {
            id: string;
            code: string;
            discount: string;
            minOrder: number;
            usage: number;
            usageLimit: number;
            usageLabel: string;
            validTill: string;
            validUntil: string;
            status: string;
        }[];
        total: number;
    }>;
    getCoupon(id: string): Promise<{
        id: string;
        code: string;
        discount: string;
        minOrder: number;
        usage: number;
        usageLimit: number;
        usageLabel: string;
        validTill: string;
        validUntil: string;
        status: string;
    }>;
    createCoupon(input: CreateCouponInput): Promise<{
        id: string;
        code: string;
        discount: string;
        minOrder: number;
        usage: number;
        usageLimit: number;
        usageLabel: string;
        validTill: string;
        validUntil: string;
        status: string;
    }>;
};
//# sourceMappingURL=offers-admin.service.d.ts.map