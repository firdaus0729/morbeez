export interface ProductListQuery {
    page?: number;
    limit?: number;
    search?: string;
    category?: string;
    status?: string;
}
export interface WizardVariantInput {
    id?: string;
    packSize: string;
    unit: string;
    mrp: string;
    sellingPrice: string;
    dealerPrice?: string;
    stock: number;
    sku?: string;
}
export interface WizardProductSaveInput {
    title: string;
    bodyHtml?: string;
    vendor?: string;
    productType?: string;
    tags?: string;
    status?: 'active' | 'draft' | 'archived';
    variants: WizardVariantInput[];
    skuPrefix?: string;
}
export declare const shopifyProductsService: {
    count(): Promise<number>;
    /** All products with every variant — for inventory grid (uses product list cache). */
    getInventoryCatalog(search?: string): Promise<{
        id: string;
        title: string;
        handle: string;
        status: string;
        vendor: string;
        productType: string;
        category: string;
        tags: string;
        bodyHtml: string;
        price: string;
        sku: string | null;
        inventory: number;
        variantCount: number;
        imageUrl: string;
        images: {
            id: string;
            src: string;
            alt: string | null;
            position: number;
        }[];
        variants: {
            id: string;
            title: string;
            option1: string;
            packSize: string;
            unit: string;
            price: string;
            mrp: string;
            sku: string;
            inventory: number;
        }[];
        createdAt: string;
        updatedAt: string;
    }[]>;
    list(query: ProductListQuery): Promise<{
        products: {
            id: string;
            title: string;
            handle: string;
            status: string;
            vendor: string;
            productType: string;
            category: string;
            tags: string;
            bodyHtml: string;
            price: string;
            sku: string | null;
            inventory: number;
            variantCount: number;
            imageUrl: string;
            images: {
                id: string;
                src: string;
                alt: string | null;
                position: number;
            }[];
            variants: {
                id: string;
                title: string;
                option1: string;
                packSize: string;
                unit: string;
                price: string;
                mrp: string;
                sku: string;
                inventory: number;
            }[];
            createdAt: string;
            updatedAt: string;
        }[];
        stats: {
            total: number;
            active: number;
            lowStock: number;
            outOfStock: number;
        };
        categories: string[];
        pagination: {
            page: number;
            limit: number;
            total: number;
            pages: number;
        };
    }>;
    get(id: string): Promise<{
        id: string;
        title: string;
        handle: string;
        status: string;
        vendor: string;
        productType: string;
        category: string;
        tags: string;
        bodyHtml: string;
        price: string;
        sku: string | null;
        inventory: number;
        variantCount: number;
        imageUrl: string;
        images: {
            id: string;
            src: string;
            alt: string | null;
            position: number;
        }[];
        variants: {
            id: string;
            title: string;
            option1: string;
            packSize: string;
            unit: string;
            price: string;
            mrp: string;
            sku: string;
            inventory: number;
        }[];
        createdAt: string;
        updatedAt: string;
    }>;
    saveWizard(id: string | null, input: WizardProductSaveInput): Promise<{
        id: string;
        title: string;
        handle: string;
        status: string;
        vendor: string;
        productType: string;
        category: string;
        tags: string;
        bodyHtml: string;
        price: string;
        sku: string | null;
        inventory: number;
        variantCount: number;
        imageUrl: string;
        images: {
            id: string;
            src: string;
            alt: string | null;
            position: number;
        }[];
        variants: {
            id: string;
            title: string;
            option1: string;
            packSize: string;
            unit: string;
            price: string;
            mrp: string;
            sku: string;
            inventory: number;
        }[];
        createdAt: string;
        updatedAt: string;
    }>;
    create(input: {
        title: string;
        bodyHtml?: string;
        vendor?: string;
        productType?: string;
        tags?: string;
        status?: "active" | "draft" | "archived";
        price?: string;
        sku?: string;
    }): Promise<{
        id: string;
        title: string;
        handle: string;
        status: string;
        vendor: string;
        productType: string;
        category: string;
        tags: string;
        bodyHtml: string;
        price: string;
        sku: string | null;
        inventory: number;
        variantCount: number;
        imageUrl: string;
        images: {
            id: string;
            src: string;
            alt: string | null;
            position: number;
        }[];
        variants: {
            id: string;
            title: string;
            option1: string;
            packSize: string;
            unit: string;
            price: string;
            mrp: string;
            sku: string;
            inventory: number;
        }[];
        createdAt: string;
        updatedAt: string;
    }>;
    update(id: string, input: {
        title?: string;
        bodyHtml?: string;
        vendor?: string;
        productType?: string;
        tags?: string;
        status?: "active" | "draft" | "archived";
        price?: string;
        sku?: string;
    }): Promise<{
        id: string;
        title: string;
        handle: string;
        status: string;
        vendor: string;
        productType: string;
        category: string;
        tags: string;
        bodyHtml: string;
        price: string;
        sku: string | null;
        inventory: number;
        variantCount: number;
        imageUrl: string;
        images: {
            id: string;
            src: string;
            alt: string | null;
            position: number;
        }[];
        variants: {
            id: string;
            title: string;
            option1: string;
            packSize: string;
            unit: string;
            price: string;
            mrp: string;
            sku: string;
            inventory: number;
        }[];
        createdAt: string;
        updatedAt: string;
    }>;
    uploadImage(productId: string, input: {
        fileName: string;
        mimeType: string;
        dataBase64: string;
        alt?: string;
    }): Promise<{
        id: string;
        src: string;
        alt: string | null;
        position: number;
    }>;
    deleteImage(productId: string, imageId: string): Promise<{
        ok: boolean;
    }>;
};
//# sourceMappingURL=shopify.products.service.d.ts.map