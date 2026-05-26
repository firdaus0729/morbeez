export declare const consoleSearchService: {
    search(query: string, limit?: number): Promise<{
        farmers: {
            id: any;
            type: string;
            title: string;
            subtitle: string;
            hash: string;
        }[];
        leads: {
            id: any;
            type: string;
            title: string;
            subtitle: string;
            hash: string;
            meta: {
                leadId: any;
            };
        }[];
        orders: {
            id: any;
            type: string;
            title: string;
            subtitle: string;
            hash: string;
        }[];
    }>;
};
//# sourceMappingURL=console-search.service.d.ts.map