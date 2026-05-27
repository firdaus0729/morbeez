import { useMemo, useState } from 'react';
import { NavLink, useLocation } from 'react-router-dom';
import { NavIcon } from './NavIcon';
import {
  defaultExpandedGroups,
  filterNav,
  isNavItemActive,
  type NavGroup,
  type NavItem,
} from '../lib/console-nav';
import type { ApiModule } from '../lib/api';
import { cn } from '../lib/cn';

type Props = {
  modules: ApiModule[];
  onNavigate?: () => void;
};

function isGroupActive(pathname: string, group: NavGroup): boolean {
  return group.children.some((c) => isNavItemActive(pathname, c.path));
}

export function SidebarNav({ modules, onNavigate }: Props) {
  const { pathname } = useLocation();
  const groups = useMemo(() => filterNav(modules), [modules]);
  const [expanded, setExpanded] = useState<Set<string>>(
    () => new Set(defaultExpandedGroups(pathname))
  );

  function toggleGroup(id: string) {
    setExpanded((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  function linkClassName(isActive: boolean, base: string) {
    return cn(base, isActive && 'active');
  }

  function renderItem(item: NavItem, baseClass: string) {
    if (item.external) {
      return (
        <li key={item.id}>
          <a
            href={item.path}
            target="_blank"
            rel="noopener noreferrer"
            className={baseClass}
            onClick={onNavigate}
          >
            <NavIcon name={item.icon} />
            <span>{item.label}</span>
          </a>
        </li>
      );
    }

    return (
      <li key={item.id}>
        <NavLink
          to={item.path}
          className={({ isActive }) =>
            linkClassName(isActive || isNavItemActive(pathname, item.path), baseClass)
          }
          onClick={onNavigate}
        >
          <NavIcon name={item.icon} />
          <span>{item.label}</span>
        </NavLink>
      </li>
    );
  }

  return (
    <ul className="sidebar-menu">
      {groups.flatMap((group) => {
        if ('items' in group) {
          return group.items.map((item) => renderItem(item, 'sidebar-link'));
        }

        const g = group as NavGroup;
        const groupActive = isGroupActive(pathname, g);
        const isOpen = expanded.has(g.id) || groupActive;

        return (
          <li key={g.id} className={cn('sidebar-group', isOpen && 'open')}>
            <button
              type="button"
              className={cn('sidebar-group-btn', groupActive && 'active-group')}
              aria-expanded={isOpen}
              onClick={() => toggleGroup(g.id)}
            >
              <NavIcon name={g.icon} />
              <span className="sidebar-group-label">{g.label}</span>
              <span className="sidebar-chevron">{isOpen ? '▾' : '▸'}</span>
            </button>
            <ul className="sidebar-submenu">
              {g.children.map((child) => (
                <li key={child.id}>
                  <NavLink
                    to={child.path}
                    className={({ isActive }) =>
                      linkClassName(
                        isActive || isNavItemActive(pathname, child.path),
                        'sidebar-sublink'
                      )
                    }
                    onClick={onNavigate}
                  >
                    <span>{child.label}</span>
                  </NavLink>
                </li>
              ))}
            </ul>
          </li>
        );
      })}
    </ul>
  );
}
