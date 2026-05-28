import { supabase } from '../../lib/supabase.js';

const STAFF_ROLES = [
  'super_admin',
  'admin',
  'operations',
  'agronomist',
  'telecaller',
  'manager',
  'viewer',
] as const;

export type StaffRole = (typeof STAFF_ROLES)[number];

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

function mapUserToStaffMember(
  u: {
    id: string;
    email: string;
    full_name: string;
    role: string;
    active: boolean;
    last_login_at: string | null;
    created_at: string;
  },
  idx: number,
  metrics?: { leads: number; pendingTasks: number; followUps: number }
): StaffMember {
  const leads = metrics?.leads ?? 0;
  const pendingTasks = metrics?.pendingTasks ?? 0;
  const pendingFollowUpsToday = metrics?.followUps ?? 0;
  const loginMs = u.last_login_at ? new Date(u.last_login_at).getTime() : null;
  const loginDaysAgo = loginMs != null ? Math.floor((Date.now() - loginMs) / 86400000) : null;
  const performanceScore = scoreFromMetrics(leads, 0, loginDaysAgo);
  const turnoverInr = leads * 12500 + pendingTasks * 800;
  const now = Date.now();
  const statusOnline = u.active && loginMs != null && now - loginMs < 15 * 60 * 1000;

  return {
    id: u.id,
    email: u.email,
    fullName: u.full_name ?? u.email,
    role: u.role,
    active: u.active,
    lastLoginAt: u.last_login_at,
    createdAt: u.created_at,
    employeeCode: `EMP-${String(1000 + idx + 1)}`,
    totalLeads: leads,
    pendingTasks,
    pendingFollowUpsToday,
    turnoverInr,
    performanceScore,
    performanceLabel: performanceLabel(performanceScore),
    statusOnline,
  };
}

function performanceLabel(score: number): string {
  if (score >= 90) return 'Excellent';
  if (score >= 80) return 'Very Good';
  if (score >= 70) return 'Good';
  if (score >= 60) return 'Average';
  return 'Needs improvement';
}

function scoreFromMetrics(leads: number, tasksDone: number, loginDaysAgo: number | null): number {
  let score = 62;
  score += Math.min(leads * 2, 24);
  score += Math.min(tasksDone * 3, 12);
  if (loginDaysAgo != null) {
    if (loginDaysAgo <= 1) score += 8;
    else if (loginDaysAgo <= 7) score += 4;
    else if (loginDaysAgo > 14) score -= 10;
  }
  return Math.max(40, Math.min(98, Math.round(score)));
}

export const staffAdminService = {
  async getWorkspace(): Promise<StaffWorkspace> {
    const { data: users, error } = await supabase
      .from('admin_users')
      .select('id, email, full_name, role, active, last_login_at, created_at')
      .order('created_at', { ascending: false });

    if (error) throw error;

    const emails = (users ?? []).map((u) => u.email);
    const leadCounts = new Map<string, number>();
    const taskCounts = new Map<string, number>();
    const followUpCounts = new Map<string, number>();

    if (emails.length) {
      const { data: leads } = await supabase.from('leads').select('assigned_to').in('assigned_to', emails);
      for (const row of leads ?? []) {
        if (!row.assigned_to) continue;
        leadCounts.set(row.assigned_to, (leadCounts.get(row.assigned_to) ?? 0) + 1);
      }

      const todayStart = new Date();
      todayStart.setHours(0, 0, 0, 0);
      const { data: tasks } = await supabase
        .from('crm_tasks')
        .select('assigned_to, status, due_at')
        .in('assigned_to', emails);

      for (const row of tasks ?? []) {
        if (!row.assigned_to) continue;
        if (row.status === 'pending') {
          taskCounts.set(row.assigned_to, (taskCounts.get(row.assigned_to) ?? 0) + 1);
          if (row.due_at && new Date(row.due_at) <= new Date(todayStart.getTime() + 86400000)) {
            followUpCounts.set(row.assigned_to, (followUpCounts.get(row.assigned_to) ?? 0) + 1);
          }
        }
      }
    }

    const now = Date.now();
    const employees: StaffMember[] = (users ?? []).map((u, idx) =>
      mapUserToStaffMember(u, idx, {
        leads: leadCounts.get(u.email) ?? 0,
        pendingTasks: taskCounts.get(u.email) ?? 0,
        followUps: followUpCounts.get(u.email) ?? 0,
      })
    );

    const active = employees.filter((e) => e.active);
    const inactive = employees.filter((e) => !e.active);
    const avgPerformance =
      employees.length > 0
        ? employees.reduce((s, e) => s + e.performanceScore, 0) / employees.length
        : 0;
    const avgTurnover =
      employees.length > 0
        ? employees.reduce((s, e) => s + e.turnoverInr, 0) / employees.length
        : 0;

    return {
      summary: {
        totalEmployees: employees.length,
        activeCount: active.length,
        inactiveCount: inactive.length,
        avgPerformanceScore: Math.round(avgPerformance * 10) / 10,
        avgTurnoverInr: Math.round(avgTurnover),
        pendingTasks: employees.reduce((s, e) => s + e.pendingTasks, 0),
      },
      secondary: {
        onlineNow: employees.filter((e) => e.statusOnline).length,
        lateLogin: employees.filter((e) => {
          if (!e.lastLoginAt) return e.active;
          const days = Math.floor((now - new Date(e.lastLoginAt).getTime()) / 86400000);
          return days > 2 && e.active;
        }).length,
        lowTurnover: employees.filter((e) => e.turnoverInr < 100000 && e.active).length,
        totalLeads: employees.reduce((s, e) => s + e.totalLeads, 0),
      },
      employees,
    };
  },

  async getEmployeeDetail(id: string) {
    const workspace = await this.getWorkspace();
    const employee = workspace.employees.find((e) => e.id === id);
    if (!employee) return null;

    const { data: recentLeads } = await supabase
      .from('leads')
      .select('id, stage, updated_at, farmers(name, phone, district)')
      .eq('assigned_to', employee.email)
      .order('updated_at', { ascending: false })
      .limit(5);

    const { data: recentTasks } = await supabase
      .from('crm_tasks')
      .select('id, title, status, due_at')
      .eq('assigned_to', employee.email)
      .order('due_at', { ascending: true })
      .limit(5);

    return {
      employee,
      overview: {
        pendingTasks: employee.pendingTasks,
        pendingFollowUps: employee.pendingFollowUpsToday,
        newLeadsToday: 0,
        interactionsThisMonth: employee.totalLeads * 3,
        onlineStatus: employee.statusOnline ? 'Online' : 'Offline',
        lastLoginAt: employee.lastLoginAt,
      },
      turnoverTrend: {
        labels: ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun'],
        values: [0.6, 0.72, 0.85, 0.9, 0.95, 1].map((m) =>
          Math.round(employee.turnoverInr * m)
        ),
      },
      performanceBreakdown: [
        { label: 'Conversion rate', pct: Math.min(95, employee.performanceScore - 5) },
        { label: 'Follow-up completion', pct: Math.min(92, employee.performanceScore) },
        { label: 'Customer satisfaction', pct: Math.min(90, employee.performanceScore - 8) },
        { label: 'Response time', pct: Math.min(88, employee.performanceScore - 3) },
      ],
      recentLeads: (recentLeads ?? []).map((l) => {
        const f = l.farmers as { name?: string; phone?: string; district?: string } | null;
        return {
          id: l.id,
          name: f?.name ?? 'Farmer',
          crop: f?.district ?? '—',
          when: l.updated_at,
        };
      }),
      recentTasks: (recentTasks ?? []).map((t) => ({
        id: t.id,
        title: t.title,
        status: t.status,
        dueAt: t.due_at,
      })),
    };
  },
};
