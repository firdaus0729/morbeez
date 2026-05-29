/** App routes are relative to React Router basename `/morbeez-staff` → full URL `/morbeez-staff/dashboard`, etc. */

export const paths = {
  login: 'login',
  acceptInvite: 'accept-invite',
  dashboard: 'dashboard',
  telecaller: 'telecaller',
  operations: 'operations',
  intelligence: 'intelligence',
  productGaps: 'product-gaps',
  agronomist: 'agronomist',
  approvals: 'approvals',
  analytics: 'analytics',
  commerce: 'commerce',
  employees: 'employees',
  employeeDetail: 'employees/:employeeId',
  settings: 'settings',
} as const;

/** Absolute in-app path (relative to basename `/morbeez-staff`). */
export function toPath(segment: string): string {
  return segment.startsWith('/') ? segment : `/${segment}`;
}

export type AppPath = (typeof paths)[keyof typeof paths];

export const ROUTE_META: Record<
  string,
  { title: string; module: string; pageKey: string }
> = {
  [toPath(paths.dashboard)]: { title: 'Dashboard', module: 'dashboard', pageKey: 'dashboard' },
  [toPath(paths.telecaller)]: {
    title: 'Telecaller CRM Workspace',
    module: 'telecaller_crm',
    pageKey: 'telecaller',
  },
  [toPath(paths.operations)]: {
    title: 'Operations Center',
    module: 'operations',
    pageKey: 'operations',
  },
  [toPath(paths.intelligence)]: {
    title: 'Agriculture Intelligence',
    module: 'intelligence',
    pageKey: 'intelligence',
  },
  [toPath(paths.productGaps)]: {
    title: 'Product Gaps',
    module: 'intelligence',
    pageKey: 'gaps',
  },
  [toPath(paths.agronomist)]: { title: 'Agronomist Hub', module: 'agronomist', pageKey: 'agronomist' },
  [toPath(paths.approvals)]: {
    title: 'Recommendation Approvals',
    module: 'approve_recommendations',
    pageKey: 'approvals',
  },
  [toPath(paths.analytics)]: { title: 'Analytics', module: 'analytics', pageKey: 'analytics' },
  [toPath(paths.commerce)]: { title: 'Commerce', module: 'commerce', pageKey: 'commerce' },
  [toPath(paths.employees)]: { title: 'Employee Workspace', module: 'settings', pageKey: 'employees' },
  [toPath(paths.settings)]: { title: 'Settings', module: 'settings', pageKey: 'settings' },
};

export function matchRouteMeta(pathname: string): { title: string; module: string; pageKey: string } {
  const key = pathname.endsWith('/') && pathname.length > 1 ? pathname.slice(0, -1) : pathname;
  if (key.startsWith('/employees/') && key !== '/employees') {
    return { title: 'Employee Details', module: 'settings', pageKey: 'employees' };
  }
  return (
    ROUTE_META[key] ?? {
      title: 'Console',
      module: 'dashboard',
      pageKey: 'dashboard',
    }
  );
}
