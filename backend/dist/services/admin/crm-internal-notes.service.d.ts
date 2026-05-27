export type InternalNoteCategory = 'general' | 'preference' | 'acreage' | 'disease_pattern' | 'callback' | 'commerce';
export declare const crmInternalNotesService: {
    list(farmerId: string, includeArchived?: boolean): Promise<{
        id: unknown;
        farmerId: unknown;
        author: unknown;
        category: unknown;
        body: unknown;
        pinned: unknown;
        archivedAt: unknown;
        createdAt: unknown;
        updatedAt: unknown;
    }[]>;
    create(farmerId: string, input: {
        body: string;
        category?: InternalNoteCategory;
        author?: string;
        pinned?: boolean;
    }): Promise<{
        id: unknown;
        farmerId: unknown;
        author: unknown;
        category: unknown;
        body: unknown;
        pinned: unknown;
        archivedAt: unknown;
        createdAt: unknown;
        updatedAt: unknown;
    }>;
    update(noteId: string, patch: {
        body?: string;
        category?: InternalNoteCategory;
        pinned?: boolean;
    }): Promise<{
        id: unknown;
        farmerId: unknown;
        author: unknown;
        category: unknown;
        body: unknown;
        pinned: unknown;
        archivedAt: unknown;
        createdAt: unknown;
        updatedAt: unknown;
    }>;
    archive(noteId: string): Promise<{
        id: unknown;
        farmerId: unknown;
        author: unknown;
        category: unknown;
        body: unknown;
        pinned: unknown;
        archivedAt: unknown;
        createdAt: unknown;
        updatedAt: unknown;
    }>;
};
//# sourceMappingURL=crm-internal-notes.service.d.ts.map