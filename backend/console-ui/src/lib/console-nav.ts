import type { ApiModule } from './api';
import { canAccess } from './api';
import { paths, toPath } from './routes';

export type NavItem = {
  id: string;
  path: string;
  label: string;
  icon: string;
  module: string;
  external?: boolean;
};

export type NavGroup = {
  id: string;
  label: string;
  icon: string;
  module: string;
  children: NavItem[];
};

export const NAV_GROUPS: Array<{ id: string; items: NavItem[] } | NavGroup> = [
  {
    id: 'main',
    items: [
      { id: 'dashboard', path: toPath(paths.dashboard), label: 'Dashboard', icon: 'dashboard', module: 'dashboard' },
    ],
  },
  {
    id: 'telecaller',
    label: 'Telecaller CRM',
    icon: 'phone',
    module: 'telecaller_crm',
    children: [
      {
        id: 'telecaller',
        path: toPath(paths.telecaller),
        label: 'Workspace',
        icon: 'phone',
        module: 'telecaller_crm',
      },
    ],
  },
  {
    id: 'ops',
    label: 'Operations',
    icon: 'operations',
    module: 'operations',
    children: [
      {
        id: 'operations',
        path: toPath(paths.operations),
        label: 'Messaging & rules',
        icon: 'operations',
        module: 'operations',
      },
    ],
  },
  {
    id: 'intel',
    label: 'Intelligence',
    icon: 'ai',
    module: 'intelligence',
    children: [
      {
        id: 'intelligence',
        path: toPath(paths.intelligence),
        label: 'Masters hub',
        icon: 'ai',
        module: 'intelligence',
      },
      {
        id: 'gaps',
        path: toPath(paths.productGaps),
        label: 'Product gaps',
        icon: 'ai',
        module: 'intelligence',
      },
    ],
  },
  {
    id: 'agro',
    label: 'Agronomist',
    icon: 'farmers',
    module: 'agronomist',
    children: [
      {
        id: 'agronomist',
        path: toPath(paths.agronomist),
        label: 'Field workflow',
        icon: 'farmers',
        module: 'agronomist',
      },
      {
        id: 'approvals',
        path: toPath(paths.approvals),
        label: 'Approvals',
        icon: 'ai',
        module: 'approve_recommendations',
      },
    ],
  },
  {
    id: 'more',
    items: [
      {
        id: 'employees',
        path: toPath(paths.employees),
        label: 'Employees',
        icon: 'users',
        module: 'settings',
      },
      {
        id: 'analytics',
        path: toPath(paths.analytics),
        label: 'Analytics',
        icon: 'analytics',
        module: 'analytics',
      },
      {
        id: 'commerce',
        path: toPath(paths.commerce),
        label: 'Commerce',
        icon: 'products',
        module: 'commerce',
      },
      {
        id: 'settings',
        path: toPath(paths.settings),
        label: 'Settings',
        icon: 'settings',
        module: 'settings',
      },
    ],
  },
];

const FIELD_LINK: NavItem = {
  id: 'field',
  path: '/field/',
  label: 'Field app ↗',
  icon: 'field',
  module: 'agronomist',
  external: true,
};

export function filterNav(modules: ApiModule[]): typeof NAV_GROUPS {
  const filtered: typeof NAV_GROUPS = [];

  for (const group of NAV_GROUPS) {
    if ('items' in group) {
      const items = group.items.filter((i) => canAccess(modules, i.module, 'read'));
      if (items.length) filtered.push({ ...group, items });
      continue;
    }
    const children = group.children.filter((c) => canAccess(modules, c.module, 'read'));
    if (canAccess(modules, group.module, 'read') && children.length) {
      filtered.push({ ...group, children });
    }
  }

  if (canAccess(modules, FIELD_LINK.module, 'read')) {
    const more = filtered.find((g) => g.id === 'more');
    if (more && 'items' in more) {
      more.items = [...more.items, FIELD_LINK];
    }
  }

  return filtered;
}

export function defaultExpandedGroups(pathname: string): string[] {
  const base = ['telecaller', 'ops', 'intel', 'agro'];
  if (pathname.startsWith(toPath(paths.commerce))) base.push('commerce');
  if (pathname.startsWith(toPath(paths.employees))) base.push('more');
  return base;
}

export function isNavItemActive(pathname: string, itemPath: string): boolean {
  if (itemPath === toPath(paths.employees)) {
    return pathname === itemPath || pathname.startsWith(`${itemPath}/`);
  }
  return pathname === itemPath;
}
