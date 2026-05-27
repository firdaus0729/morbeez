export type StaffMember = {
    id: string;
    email: string;
    fullName: string;
    role: string;
    active: boolean;
    lastLoginAt: string | null;
    createdAt: string;
    employeeCode: string;
    totalLeads: number;
    pendingTasks: number;
    pendingFollowUpsToday: number;
    turnoverInr: number;
    performanceScore: number;
    performanceLabel: string;
    statusOnline: boolean;
};
export type StaffWorkspace = {
    summary: {
        totalEmployees: number;
        activeCount: number;
        inactiveCount: number;
        avgPerformanceScore: number;
        avgTurnoverInr: number;
        pendingTasks: number;
    };
    secondary: {
        onlineNow: number;
        lateLogin: number;
        lowTurnover: number;
        totalLeads: number;
    };
    employees: StaffMember[];
};
export declare const staffAdminService: {
    getWorkspace(): Promise<StaffWorkspace>;
    getEmployeeDetail(id: string): Promise<{
        employee: StaffMember;
        overview: {
            pendingTasks: number;
            pendingFollowUps: number;
            newLeadsToday: number;
            interactionsThisMonth: number;
            onlineStatus: string;
            lastLoginAt: string | null;
        };
        turnoverTrend: {
            labels: string[];
            values: number[];
        };
        performanceBreakdown: {
            label: string;
            pct: number;
        }[];
        recentLeads: {
            id: any;
            name: string;
            crop: string;
            when: any;
        }[];
        recentTasks: {
            id: any;
            title: any;
            status: any;
            dueAt: any;
        }[];
    } | null>;
};
//# sourceMappingURL=staff-admin.service.d.ts.map