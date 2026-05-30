import { supabase } from '../../lib/supabase.js';
import { throwIfSupabaseError } from '../../lib/supabase-errors.js';

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
  /** employee_profiles.id when HR profile exists; otherwise admin_users.id */
  id: string;
  adminUserId: string | null;
  hasProfile: boolean;
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

type AdminRow = {
  id: string;
  email: string;
  full_name: string;
  role: string;
  active: boolean;
  last_login_at: string | null;
  created_at: string;
};

type ProfileRow = {
  id: string;
  admin_user_id: string | null;
  employee_code: string;
  full_name: string;
  email: string | null;
  role: string;
  status: string;
  created_at: string;
};

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

function buildStaffMember(
  params: {
    id: string;
    adminUserId: string | null;
    hasProfile: boolean;
    email: string;
    fullName: string;
    role: string;
    active: boolean;
    lastLoginAt: string | null;
    createdAt: string;
    employeeCode: string;
  },
  metrics?: { leads: number; pendingTasks: number; followUps: number }
): StaffMember {
  const leads = metrics?.leads ?? 0;
  const pendingTasks = metrics?.pendingTasks ?? 0;
  const pendingFollowUpsToday = metrics?.followUps ?? 0;
  const loginMs = params.lastLoginAt ? new Date(params.lastLoginAt).getTime() : null;
  const loginDaysAgo = loginMs != null ? Math.floor((Date.now() - loginMs) / 86400000) : null;
  const performanceScore = scoreFromMetrics(leads, 0, loginDaysAgo);
  const turnoverInr = leads * 12500 + pendingTasks * 800;
  const now = Date.now();
  const statusOnline = params.active && loginMs != null && now - loginMs < 15 * 60 * 1000;

  return {
    id: params.id,
    adminUserId: params.adminUserId,
    hasProfile: params.hasProfile,
    email: params.email,
    fullName: params.fullName,
    role: params.role,
    active: params.active,
    lastLoginAt: params.lastLoginAt,
    createdAt: params.createdAt,
    employeeCode: params.employeeCode,
    totalLeads: leads,
    pendingTasks,
    pendingFollowUpsToday,
    turnoverInr,
    performanceScore,
    performanceLabel: performanceLabel(performanceScore),
    statusOnline,
  };
}

async function loadAssignmentMetrics(emails: string[]) {
  const leadCounts = new Map<string, number>();
  const taskCounts = new Map<string, number>();
  const followUpCounts = new Map<string, number>();

  if (!emails.length) {
    return { leadCounts, taskCounts, followUpCounts };
  }

  const { data: leads, error: leadsErr } = await supabase
    .from('leads')
    .select('assigned_to')
    .in('assigned_to', emails);
  throwIfSupabaseError(leadsErr, 'Could not load lead assignments');
  for (const row of leads ?? []) {
    if (!row.assigned_to) continue;
    leadCounts.set(row.assigned_to, (leadCounts.get(row.assigned_to) ?? 0) + 1);
  }

  const todayStart = new Date();
  todayStart.setHours(0, 0, 0, 0);
  const { data: tasks, error: tasksErr } = await supabase
    .from('crm_tasks')
    .select('assigned_to, status, due_at')
    .in('assigned_to', emails);
  throwIfSupabaseError(tasksErr, 'Could not load task assignments');

  for (const row of tasks ?? []) {
    if (!row.assigned_to) continue;
    if (row.status === 'pending') {
      taskCounts.set(row.assigned_to, (taskCounts.get(row.assigned_to) ?? 0) + 1);
      if (row.due_at && new Date(row.due_at) <= new Date(todayStart.getTime() + 86400000)) {
        followUpCounts.set(row.assigned_to, (followUpCounts.get(row.assigned_to) ?? 0) + 1);
      }
    }
  }

  return { leadCounts, taskCounts, followUpCounts };
}

export const staffAdminService = {
  async getWorkspace(): Promise<StaffWorkspace> {
    const { data: profiles, error: profileErr } = await supabase
      .from('employee_profiles')
      .select(
        'id, admin_user_id, employee_code, full_name, email, role, status, created_at'
      )
      .order('created_at', { ascending: false });
    throwIfSupabaseError(profileErr, 'Could not load employee profiles');

    const adminIds = [
      ...new Set(
        (profiles ?? [])
          .map((p) => p.admin_user_id)
          .filter((id): id is string => Boolean(id))
      ),
    ];
    const adminById = new Map<string, AdminRow>();
    if (adminIds.length) {
      const { data: admins, error: adminsErr } = await supabase
        .from('admin_users')
        .select('id, email, full_name, role, active, last_login_at, created_at')
        .in('id', adminIds);
      throwIfSupabaseError(adminsErr, 'Could not load linked admin accounts');
      for (const a of admins ?? []) {
        adminById.set(a.id, a as AdminRow);
      }
    }

    const linkedAdminIds = new Set<string>();
    const employees: StaffMember[] = [];

    for (const row of (profiles ?? []) as ProfileRow[]) {
      const admin = row.admin_user_id ? adminById.get(row.admin_user_id) ?? null : null;
      const email = (admin?.email ?? row.email ?? '').trim().toLowerCase();
      if (!email) continue;
      if (admin?.id) linkedAdminIds.add(admin.id);

      const profileActive = row.status === 'active';
      const adminActive = admin ? admin.active : true;
      const active = profileActive && adminActive;

      employees.push(
        buildStaffMember(
          {
            id: row.id,
            adminUserId: row.admin_user_id,
            hasProfile: true,
            email,
            fullName: row.full_name || admin?.full_name || email,
            role: row.role || admin?.role || 'viewer',
            active,
            lastLoginAt: admin?.last_login_at ?? null,
            createdAt: row.created_at,
            employeeCode: row.employee_code,
          },
          undefined
        )
      );
    }

    const { data: orphanAdmins, error: adminErr } = await supabase
      .from('admin_users')
      .select('id, email, full_name, role, active, last_login_at, created_at')
      .order('created_at', { ascending: false });
    throwIfSupabaseError(adminErr, 'Could not load admin users');

    for (const u of orphanAdmins ?? []) {
      if (linkedAdminIds.has(u.id)) continue;
      const email = String(u.email).trim().toLowerCase();
      employees.push(
        buildStaffMember({
          id: u.id,
          adminUserId: u.id,
          hasProfile: false,
          email,
          fullName: u.full_name ?? email,
          role: u.role,
          active: u.active,
          lastLoginAt: u.last_login_at,
          createdAt: u.created_at,
          employeeCode: `ADM-${u.id.replace(/-/g, '').slice(0, 6).toUpperCase()}`,
        })
      );
    }

    const emails = [...new Set(employees.map((e) => e.email))];
    const { leadCounts, taskCounts, followUpCounts } = await loadAssignmentMetrics(emails);
    for (const e of employees) {
      e.totalLeads = leadCounts.get(e.email) ?? 0;
      e.pendingTasks = taskCounts.get(e.email) ?? 0;
      e.pendingFollowUpsToday = followUpCounts.get(e.email) ?? 0;
      const loginMs = e.lastLoginAt ? new Date(e.lastLoginAt).getTime() : null;
      const loginDaysAgo = loginMs != null ? Math.floor((Date.now() - loginMs) / 86400000) : null;
      e.performanceScore = scoreFromMetrics(e.totalLeads, 0, loginDaysAgo);
      e.performanceLabel = performanceLabel(e.performanceScore);
      e.turnoverInr = e.totalLeads * 12500 + e.pendingTasks * 800;
      const now = Date.now();
      e.statusOnline = e.active && loginMs != null && now - loginMs < 15 * 60 * 1000;
    }

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
    const now = Date.now();

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
    const employee =
      workspace.employees.find((e) => e.id === id) ??
      workspace.employees.find((e) => e.adminUserId === id);
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
        values: [0.6, 0.72, 0.85, 0.9, 0.95, 1].map((m) => Math.round(employee.turnoverInr * m)),
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
