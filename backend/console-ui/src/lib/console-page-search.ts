/** Default search behavior per console route (pages can override via useRegisterPageSearch). */

export type PageSearchMode = 'none' | 'global' | 'local';

export type PageSearchDefaults = {
  mode: PageSearchMode;
  placeholder?: string;
};

export const PAGE_SEARCH_DEFAULTS: Record<string, PageSearchDefaults> = {
  dashboard: {
    mode: 'global',
    placeholder: 'Search farmers, leads, orders, phone…',
  },
  telecaller: { mode: 'none' },
  operations: {
    mode: 'local',
    placeholder: 'Search broadcasts, prices, terminology…',
  },
  intelligence: {
    mode: 'local',
    placeholder: 'Search rules, templates, tasks…',
  },
  gaps: {
    mode: 'local',
    placeholder: 'Search technical name, crop, district…',
  },
  agronomist: {
    mode: 'local',
    placeholder: 'Search farmer, crop, issue, phone…',
  },
  approvals: {
    mode: 'local',
    placeholder: 'Search farmer, issue, recommendation…',
  },
  analytics: { mode: 'none' },
  commerce: {
    mode: 'local',
    placeholder: 'Search orders, farmers, products…',
  },
  employees: {
    mode: 'local',
    placeholder: 'Search by name, email, phone, ID…',
  },
  settings: { mode: 'none' },
};

export function defaultsForPage(pageKey: string): PageSearchDefaults {
  return PAGE_SEARCH_DEFAULTS[pageKey] ?? { mode: 'none' };
}
