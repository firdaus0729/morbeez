export type LeadStage = 'new_lead' | 'interested' | 'follow_up' | 'recommendation' | 'order_placed' | 'repeat_customer';
export interface TelecallerListQuery {
    scope?: 'mine' | 'all';
    stage?: string;
    search?: string;
    page?: number;
    limit?: number;
    assignedTo?: string;
}
export declare const telecallerAdminService: {
    stageLabels: Record<LeadStage, string>;
    getOverview(agentEmail: string): Promise<{
        callsToday: number;
        pendingFollowUps: number;
        interestedFarmers: number;
        ordersGenerated: number;
        revenue: number;
        conversionRate: number;
        myLeadsCount: number;
        allLeadsCount: number;
    }>;
    listLeads(query: TelecallerListQuery, agentEmail: string): Promise<{
        leads: {
            id: unknown;
            farmerId: unknown;
            intent: unknown;
            source: unknown;
            status: unknown;
            stage: LeadStage;
            stageLabel: string;
            priority: unknown;
            assignedTo: unknown;
            notes: unknown;
            followUpAt: unknown;
            followUpLabel: string | null;
            lastInteractionAt: unknown;
            lastInteractionLabel: string | null;
            leadScore: number;
            createdAt: unknown;
            farmerName: string;
            farmerInitials: string;
            phone: {} | null;
            district: {} | null;
            state: {} | null;
            farmerStatus: string;
        }[];
        counts: {
            mine: number;
            all: number;
        };
        pagination: {
            page: number;
            limit: number;
            total: number;
            pages: number;
        };
    }>;
    getLeadDetail(leadId: string): Promise<{
        lead: {
            id: unknown;
            farmerId: unknown;
            intent: unknown;
            source: unknown;
            status: unknown;
            stage: LeadStage;
            stageLabel: string;
            priority: unknown;
            assignedTo: unknown;
            notes: unknown;
            followUpAt: unknown;
            followUpLabel: string | null;
            lastInteractionAt: unknown;
            lastInteractionLabel: string | null;
            leadScore: number;
            createdAt: unknown;
            farmerName: string;
            farmerInitials: string;
            phone: {} | null;
            district: {} | null;
            state: {} | null;
            farmerStatus: string;
        };
        farmer: {
            id: string;
            name: string;
            phone: {} | null;
            email: null;
            district: {} | null;
            state: {} | null;
            language: {};
            territory: string;
            crop: string;
            acreage: string;
            farmSize: string;
            irrigation: string;
            soilType: string;
            rating: number;
        };
        farmOverview: {
            totalBlocks: {};
            totalArea: {};
            primaryCrop: string;
            soilType: {};
        };
        soilReport: {
            reportId: {};
            date: {};
            health: {};
            ph: {};
        };
        tasks: {
            id: any;
            title: any;
            dueAt: any;
            dueLabel: string | null;
            status: any;
            type: any;
        }[];
        nextFollowUp: {
            id: any;
            title: any;
            dueLabel: string | null;
            notes: any;
        } | null;
        timeline: {
            id: string;
            type: string;
            title: string;
            detail: string;
            at: string;
            atLabel: string;
        }[];
        orders: {
            id: any;
            label: any;
            amount: number;
            date: string | null;
        }[];
        stages: {
            id: string;
            label: string;
            active: boolean;
            done: boolean;
        }[];
    }>;
    stageIndex(stage: LeadStage): number;
    createLead(input: {
        phone: string;
        name?: string;
        intent?: string;
        notes?: string;
        cropType?: string;
        district?: string;
        state?: string;
    }, agentEmail: string): Promise<{
        lead: {
            id: unknown;
            farmerId: unknown;
            intent: unknown;
            source: unknown;
            status: unknown;
            stage: LeadStage;
            stageLabel: string;
            priority: unknown;
            assignedTo: unknown;
            notes: unknown;
            followUpAt: unknown;
            followUpLabel: string | null;
            lastInteractionAt: unknown;
            lastInteractionLabel: string | null;
            leadScore: number;
            createdAt: unknown;
            farmerName: string;
            farmerInitials: string;
            phone: {} | null;
            district: {} | null;
            state: {} | null;
            farmerStatus: string;
        };
        farmer: {
            id: string;
            name: string;
            phone: {} | null;
            email: null;
            district: {} | null;
            state: {} | null;
            language: {};
            territory: string;
            crop: string;
            acreage: string;
            farmSize: string;
            irrigation: string;
            soilType: string;
            rating: number;
        };
        farmOverview: {
            totalBlocks: {};
            totalArea: {};
            primaryCrop: string;
            soilType: {};
        };
        soilReport: {
            reportId: {};
            date: {};
            health: {};
            ph: {};
        };
        tasks: {
            id: any;
            title: any;
            dueAt: any;
            dueLabel: string | null;
            status: any;
            type: any;
        }[];
        nextFollowUp: {
            id: any;
            title: any;
            dueLabel: string | null;
            notes: any;
        } | null;
        timeline: {
            id: string;
            type: string;
            title: string;
            detail: string;
            at: string;
            atLabel: string;
        }[];
        orders: {
            id: any;
            label: any;
            amount: number;
            date: string | null;
        }[];
        stages: {
            id: string;
            label: string;
            active: boolean;
            done: boolean;
        }[];
    }>;
    updateLead(leadId: string, patch: {
        stage?: LeadStage;
        notes?: string;
        followUpAt?: string | null;
        assignedTo?: string | null;
        priority?: string;
    }, agentEmail: string): Promise<{
        lead: {
            id: unknown;
            farmerId: unknown;
            intent: unknown;
            source: unknown;
            status: unknown;
            stage: LeadStage;
            stageLabel: string;
            priority: unknown;
            assignedTo: unknown;
            notes: unknown;
            followUpAt: unknown;
            followUpLabel: string | null;
            lastInteractionAt: unknown;
            lastInteractionLabel: string | null;
            leadScore: number;
            createdAt: unknown;
            farmerName: string;
            farmerInitials: string;
            phone: {} | null;
            district: {} | null;
            state: {} | null;
            farmerStatus: string;
        };
        farmer: {
            id: string;
            name: string;
            phone: {} | null;
            email: null;
            district: {} | null;
            state: {} | null;
            language: {};
            territory: string;
            crop: string;
            acreage: string;
            farmSize: string;
            irrigation: string;
            soilType: string;
            rating: number;
        };
        farmOverview: {
            totalBlocks: {};
            totalArea: {};
            primaryCrop: string;
            soilType: {};
        };
        soilReport: {
            reportId: {};
            date: {};
            health: {};
            ph: {};
        };
        tasks: {
            id: any;
            title: any;
            dueAt: any;
            dueLabel: string | null;
            status: any;
            type: any;
        }[];
        nextFollowUp: {
            id: any;
            title: any;
            dueLabel: string | null;
            notes: any;
        } | null;
        timeline: {
            id: string;
            type: string;
            title: string;
            detail: string;
            at: string;
            atLabel: string;
        }[];
        orders: {
            id: any;
            label: any;
            amount: number;
            date: string | null;
        }[];
        stages: {
            id: string;
            label: string;
            active: boolean;
            done: boolean;
        }[];
    }>;
    addNote(leadId: string, note: string, agentEmail: string): Promise<{
        lead: {
            id: unknown;
            farmerId: unknown;
            intent: unknown;
            source: unknown;
            status: unknown;
            stage: LeadStage;
            stageLabel: string;
            priority: unknown;
            assignedTo: unknown;
            notes: unknown;
            followUpAt: unknown;
            followUpLabel: string | null;
            lastInteractionAt: unknown;
            lastInteractionLabel: string | null;
            leadScore: number;
            createdAt: unknown;
            farmerName: string;
            farmerInitials: string;
            phone: {} | null;
            district: {} | null;
            state: {} | null;
            farmerStatus: string;
        };
        farmer: {
            id: string;
            name: string;
            phone: {} | null;
            email: null;
            district: {} | null;
            state: {} | null;
            language: {};
            territory: string;
            crop: string;
            acreage: string;
            farmSize: string;
            irrigation: string;
            soilType: string;
            rating: number;
        };
        farmOverview: {
            totalBlocks: {};
            totalArea: {};
            primaryCrop: string;
            soilType: {};
        };
        soilReport: {
            reportId: {};
            date: {};
            health: {};
            ph: {};
        };
        tasks: {
            id: any;
            title: any;
            dueAt: any;
            dueLabel: string | null;
            status: any;
            type: any;
        }[];
        nextFollowUp: {
            id: any;
            title: any;
            dueLabel: string | null;
            notes: any;
        } | null;
        timeline: {
            id: string;
            type: string;
            title: string;
            detail: string;
            at: string;
            atLabel: string;
        }[];
        orders: {
            id: any;
            label: any;
            amount: number;
            date: string | null;
        }[];
        stages: {
            id: string;
            label: string;
            active: boolean;
            done: boolean;
        }[];
    }>;
    createTask(leadId: string, input: {
        title: string;
        dueAt?: string;
        notes?: string;
        taskType?: string;
    }, agentEmail: string): Promise<any>;
    completeTask(taskId: string): Promise<void>;
    logCall(leadId: string, input: {
        outcome?: string;
        notes?: string;
        durationSeconds?: number;
    }, agentEmail: string): Promise<{
        lead: {
            id: unknown;
            farmerId: unknown;
            intent: unknown;
            source: unknown;
            status: unknown;
            stage: LeadStage;
            stageLabel: string;
            priority: unknown;
            assignedTo: unknown;
            notes: unknown;
            followUpAt: unknown;
            followUpLabel: string | null;
            lastInteractionAt: unknown;
            lastInteractionLabel: string | null;
            leadScore: number;
            createdAt: unknown;
            farmerName: string;
            farmerInitials: string;
            phone: {} | null;
            district: {} | null;
            state: {} | null;
            farmerStatus: string;
        };
        farmer: {
            id: string;
            name: string;
            phone: {} | null;
            email: null;
            district: {} | null;
            state: {} | null;
            language: {};
            territory: string;
            crop: string;
            acreage: string;
            farmSize: string;
            irrigation: string;
            soilType: string;
            rating: number;
        };
        farmOverview: {
            totalBlocks: {};
            totalArea: {};
            primaryCrop: string;
            soilType: {};
        };
        soilReport: {
            reportId: {};
            date: {};
            health: {};
            ph: {};
        };
        tasks: {
            id: any;
            title: any;
            dueAt: any;
            dueLabel: string | null;
            status: any;
            type: any;
        }[];
        nextFollowUp: {
            id: any;
            title: any;
            dueLabel: string | null;
            notes: any;
        } | null;
        timeline: {
            id: string;
            type: string;
            title: string;
            detail: string;
            at: string;
            atLabel: string;
        }[];
        orders: {
            id: any;
            label: any;
            amount: number;
            date: string | null;
        }[];
        stages: {
            id: string;
            label: string;
            active: boolean;
            done: boolean;
        }[];
    }>;
    listTasks(agentEmail: string, status?: string): Promise<{
        id: any;
        title: any;
        dueLabel: string | null;
        status: any;
        farmerName: string;
        phone: unknown;
        leadId: any;
        stage: string | undefined;
    }[]>;
    listCalls(agentEmail?: string, limit?: number): Promise<{
        id: any;
        farmerName: string;
        phone: unknown;
        outcome: any;
        durationSeconds: any;
        agentEmail: any;
        atLabel: string | null;
        notes: any;
    }[]>;
    listWhatsAppThreads(limit?: number): Promise<Record<string, unknown>[]>;
    getWhatsAppMessages(farmerId: string): Promise<{
        id: any;
        direction: any;
        content: any;
        atLabel: string | null;
        createdAt: any;
    }[]>;
    sendWhatsAppMessage(farmerId: string, text: string, agentEmail: string): Promise<{
        messages: {
            id: any;
            direction: any;
            content: any;
            atLabel: string | null;
            createdAt: any;
        }[];
        sent: boolean;
    }>;
    listFieldFindings(farmerId: string, page?: number, limit?: number): Promise<{
        findings: {
            id: unknown;
            visitedAt: unknown;
            visitedLabel: string | null;
            blockName: unknown;
            cropType: unknown;
            agronomistName: unknown;
            agronomistRole: unknown;
            agronomistInitials: string;
            observations: unknown;
            parameters: {
                label: string;
                value: string;
            }[];
            diseasePest: unknown;
            diseaseTone: unknown;
            actionTaken: unknown;
            followUpLabel: string | null;
            photoUrls: string[];
            photoCount: number;
        }[];
        pagination: {
            page: number;
            limit: number;
            total: number;
            pages: number;
        };
    }>;
    mapFieldFinding(r: Record<string, unknown>): {
        id: unknown;
        visitedAt: unknown;
        visitedLabel: string | null;
        blockName: unknown;
        cropType: unknown;
        agronomistName: unknown;
        agronomistRole: unknown;
        agronomistInitials: string;
        observations: unknown;
        parameters: {
            label: string;
            value: string;
        }[];
        diseasePest: unknown;
        diseaseTone: unknown;
        actionTaken: unknown;
        followUpLabel: string | null;
        photoUrls: string[];
        photoCount: number;
    };
    demoFieldFindings(farmerId: string): Record<string, unknown>[];
    createFieldFinding(farmerId: string, leadId: string | null, input: {
        blockId?: string;
        blockName: string;
        cropType: string;
        observations?: string;
        diseasePest?: string;
        diseaseTone?: string;
        actionTaken?: string;
        parameters?: {
            label: string;
            value: string;
        }[];
    }): Promise<{
        id: unknown;
        visitedAt: unknown;
        visitedLabel: string | null;
        blockName: unknown;
        cropType: unknown;
        agronomistName: unknown;
        agronomistRole: unknown;
        agronomistInitials: string;
        observations: unknown;
        parameters: {
            label: string;
            value: string;
        }[];
        diseasePest: unknown;
        diseaseTone: unknown;
        actionTaken: unknown;
        followUpLabel: string | null;
        photoUrls: string[];
        photoCount: number;
    }>;
    getNavBadges(): Promise<{
        followUpTasks: number;
    }>;
};
//# sourceMappingURL=telecaller-admin.service.d.ts.map