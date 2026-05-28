import { useState } from 'react';
import { matchRouteMeta } from '../lib/routes';
import { WorkspaceHeader } from './WorkspaceHeader';

const SEARCH_PLACEHOLDERS: Record<string, string> = {
  dashboard: 'Search farmers, orders, KPIs…',
  operations: 'Search campaigns, templates, broadcasts…',
  intelligence: 'Search crops, rules, templates…',
  gaps: 'Search product gaps, districts…',
  agronomist: 'Search findings, farmers, blocks…',
  approvals: 'Search pending recommendations…',
  analytics: 'Search reports, metrics, regions…',
  commerce: 'Search orders, products, offers…',
  employees: 'Search employees, roles, payroll…',
  settings: 'Search settings, users, modules…',
};

type Props = {
  pathname: string;
  dateText: string;
  onOpenMenu: () => void;
  onLogout: () => void;
};

export function ConsoleTopbar({ pathname, dateText, onOpenMenu, onLogout }: Props) {
  const meta = matchRouteMeta(pathname);
  const [search, setSearch] = useState('');

  const placeholder =
    SEARCH_PLACEHOLDERS[meta.pageKey] ?? 'Search records, farmers, IDs…';

  return (
    <WorkspaceHeader
      title={meta.title}
      onOpenMenu={onOpenMenu}
      onLogout={onLogout}
      search={{
        id: `search-${meta.pageKey}`,
        value: search,
        onChange: setSearch,
        placeholder,
      }}
      showDate
      dateText={dateText}
      notificationCount={0}
    />
  );
}
