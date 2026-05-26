import { icon } from './icons.js';

/** Sidebar navigation — grouped like Telecaller CRM mockup */
export const NAV_GROUPS = [
  {
    id: 'main',
    items: [{ id: 'dashboard', label: 'Dashboard', hash: 'dashboard', icon: 'dashboard', live: true }],
  },
  {
    id: 'telecaller',
    label: 'Telecaller CRM',
    icon: 'phone',
    live: true,
    children: [
      { id: 'telecaller', label: 'Workspace', hash: 'telecaller', live: true },
      { id: 'telecaller/followups', label: 'Follow-up Tasks', hash: 'telecaller/followups', live: true, badgeKey: 'followUpTasks' },
      { id: 'telecaller/calls', label: 'Calls', hash: 'telecaller/calls', live: true },
    ],
  },
  {
    id: 'ai',
    label: 'AI Advisory',
    icon: 'ai',
    live: true,
    children: [
      { id: 'ai-advisory', label: 'Overview', hash: 'ai-advisory', live: true },
      { id: 'ai-mapping', label: 'AI Mapping', hash: 'ai-mapping', live: true },
    ],
  },
  {
    id: 'farmers-crm',
    label: 'Farmers CRM',
    icon: 'farmers',
    live: true,
    children: [{ id: 'farmers', label: 'Farmers List', hash: 'farmers', live: true }],
  },
  {
    id: 'whatsapp-crm',
    label: 'WhatsApp CRM',
    icon: 'whatsapp',
    live: true,
    children: [{ id: 'whatsapp-crm', label: 'Inbox', hash: 'whatsapp-crm', live: true }],
  },
  {
    id: 'commerce',
    label: 'Commerce',
    icon: 'products',
    live: true,
    children: [
      { id: 'products', label: 'Products', hash: 'products', live: true },
      { id: 'inventory', label: 'Inventory', hash: 'inventory', live: true },
      { id: 'orders', label: 'Orders', hash: 'orders', live: true },
      { id: 'offers', label: 'Offers', hash: 'offers', live: true },
      { id: 'flash-sales', label: 'Flash Sales', hash: 'flash-sales', live: true },
      { id: 'combos', label: 'Combos', hash: 'combos', live: true },
    ],
  },
  {
    id: 'more',
    items: [
      { id: 'analytics', label: 'Analytics', hash: 'analytics', icon: 'analytics', live: false },
      { id: 'content', label: 'Content', hash: 'content', icon: 'content', live: false },
      { id: 'staff', label: 'Employees', hash: 'staff', icon: 'users', live: true },
      { id: 'settings', label: 'Settings', hash: 'settings', icon: 'settings', live: true },
    ],
  },
];

/** @deprecated flat list — kept for compatibility */
export const NAV_ITEMS = [];

export const ROUTE_TITLES = {
  dashboard: 'Dashboard',
  telecaller: 'Telecaller CRM Workspace',
  'telecaller/followups': 'Follow-up Tasks',
  'telecaller/calls': 'Calls',
  'telecaller/lead': 'Telecaller CRM Workspace',
  products: 'Products',
  'products/new': 'Add Product',
  'products/edit': 'Edit Product',
  inventory: 'Inventory',
  orders: 'Orders',
  'orders/detail': 'Order Details',
  farmers: 'Farmers',
  offers: 'Offers',
  combos: 'Combos',
  'flash-sales': 'Flash Sales',
  'ai-advisory': 'AI Advisory',
  'ai-mapping': 'AI Mapping',
  'whatsapp-crm': 'WhatsApp CRM',
  whatsapp: 'WhatsApp',
  content: 'Content',
  analytics: 'Analytics',
  staff: 'Employees',
  settings: 'Settings',
};

function routeMatchesNav(route, itemId) {
  if (route === itemId) return true;
  if (itemId === 'products' && route.startsWith('products')) return true;
  if (itemId === 'orders' && route.startsWith('orders')) return true;
  if (itemId === 'telecaller' && route.startsWith('telecaller')) return true;
  if (itemId === 'ai-advisory' && (route === 'ai-advisory' || route === 'ai-mapping')) return true;
  return false;
}

function isGroupActive(route, group) {
  if (group.children) {
    return group.children.some((c) => routeMatchesNav(route, c.id) || route === c.hash);
  }
  return false;
}

export function renderSidebarNav(activeRoute) {
  const route = activeRoute || 'dashboard';
  const expanded = new Set(
    JSON.parse(sessionStorage.getItem('nav-expanded') || '["telecaller","commerce","ai","farmers-crm"]')
  );

  const parts = [];

  for (const group of NAV_GROUPS) {
    if (group.items) {
      for (const item of group.items) {
        if (!item.live && item.live !== undefined) continue;
        const active = routeMatchesNav(route, item.id);
        parts.push(`<li>
          <a href="#${item.hash}" data-nav="${item.id}" class="sidebar-link ${active ? 'active' : ''}">
            ${icon(item.icon, 'nav-icon')}
            <span>${item.label}</span>
          </a>
        </li>`);
      }
      continue;
    }

    if (!group.live) continue;
    const groupActive = isGroupActive(route, group);
    const isOpen = expanded.has(group.id) || groupActive;
    const chevron = isOpen ? '▾' : '▸';

    const childLinks = (group.children || [])
      .filter((c) => c.live !== false)
      .map((c) => {
        const active = route === c.hash || route === c.id;
        const badge =
          c.badgeKey && typeof window !== 'undefined' && window.__navBadges?.[c.badgeKey]
            ? `<span class="sidebar-badge">${window.__navBadges[c.badgeKey]}</span>`
            : '';
        return `<li>
          <a href="#${c.hash}" data-nav="${c.id}" class="sidebar-sublink ${active ? 'active' : ''}">
            <span>${c.label}</span>${badge}
          </a>
        </li>`;
      })
      .join('');

    parts.push(`<li class="sidebar-group ${isOpen ? 'open' : ''}">
      <button type="button" class="sidebar-group-btn ${groupActive ? 'active-group' : ''}" data-nav-group="${group.id}" aria-expanded="${isOpen}">
        ${icon(group.icon, 'nav-icon')}
        <span class="sidebar-group-label">${group.label}</span>
        <span class="sidebar-chevron">${chevron}</span>
      </button>
      <ul class="sidebar-submenu">${childLinks}</ul>
    </li>`);
  }

  return `<ul class="sidebar-menu">${parts.join('')}</ul>`;
}

export function bindSidebarGroups(root) {
  root?.querySelectorAll('[data-nav-group]').forEach((btn) => {
    btn.addEventListener('click', () => {
      const id = btn.dataset.navGroup;
      const expanded = new Set(
        JSON.parse(sessionStorage.getItem('nav-expanded') || '["telecaller","commerce"]')
      );
      if (expanded.has(id)) expanded.delete(id);
      else expanded.add(id);
      sessionStorage.setItem('nav-expanded', JSON.stringify([...expanded]));
      btn.closest('.sidebar-group')?.classList.toggle('open');
      const open = btn.closest('.sidebar-group')?.classList.contains('open');
      btn.setAttribute('aria-expanded', String(open));
      btn.querySelector('.sidebar-chevron').textContent = open ? '▾' : '▸';
    });
  });
}

export function roleLabel(role) {
  const map = { admin: 'Super Admin', manager: 'Manager', viewer: 'Viewer' };
  return map[role] || role;
}
