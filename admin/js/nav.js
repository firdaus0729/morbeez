import { icon } from './icons.js';
import { isAdmin } from './core.js';

/** Sidebar navigation — `live: true` = implemented */
export const NAV_SECTIONS = [
  {
    label: 'Overview',
    items: [{ id: 'dashboard', label: 'Dashboard', hash: 'dashboard', icon: 'dashboard', live: true }],
  },
  {
    label: 'Commerce',
    items: [
      { id: 'products', label: 'Products', hash: 'products', icon: 'products', live: true },
      { id: 'inventory', label: 'Low stock', hash: 'inventory', icon: 'inventory', live: true },
      { id: 'orders', label: 'Orders', hash: 'orders', icon: 'orders', live: true },
      { id: 'offers', label: 'Offers & coupons', hash: 'offers', icon: 'offers', live: false },
      { id: 'combos', label: 'Combo kits', hash: 'combos', icon: 'products', live: false },
      { id: 'flash-sales', label: 'Flash sales', hash: 'flash-sales', icon: 'offers', live: false },
    ],
  },
  {
    label: 'Farmers & AI',
    items: [
      { id: 'farmers', label: 'Farmer CRM', hash: 'farmers', icon: 'farmers', live: true },
      { id: 'ai-advisory', label: 'AI advisory rules', hash: 'ai-advisory', icon: 'ai', live: false },
      { id: 'whatsapp', label: 'WhatsApp campaigns', hash: 'whatsapp', icon: 'whatsapp', live: false },
    ],
  },
  {
    label: 'Content & insights',
    items: [
      { id: 'content', label: 'Content CMS', hash: 'content', icon: 'content', live: false },
      { id: 'analytics', label: 'Analytics', hash: 'analytics', icon: 'analytics', live: false },
    ],
  },
  {
    label: 'System',
    items: [
      { id: 'staff', label: 'Staff accounts', hash: 'staff', icon: 'staff', live: true, adminOnly: true },
      { id: 'settings', label: 'Settings', hash: 'settings', icon: 'settings', live: true },
    ],
  },
];

export const ROUTE_TITLES = {
  dashboard: 'Dashboard',
  products: 'Products',
  'products/new': 'New product',
  'products/edit': 'Edit product',
  inventory: 'Low stock inventory',
  orders: 'Orders',
  farmers: 'Farmer CRM',
  offers: 'Offers & coupons',
  combos: 'Combo management',
  'flash-sales': 'Flash sales',
  'ai-advisory': 'AI advisory engine',
  whatsapp: 'WhatsApp admin',
  content: 'Content management',
  analytics: 'Analytics',
  staff: 'Staff accounts',
  settings: 'Settings',
};

export function renderSidebarNav(activeRoute) {
  const base = activeRoute.split('/')[0];
  const html = NAV_SECTIONS.map((section) => {
    const items = section.items
      .filter((item) => !item.adminOnly || isAdmin())
      .map((item) => {
        const active = item.id === base || (item.id === 'products' && base === 'products');
        const badge = item.live ? '' : '<span class="nav-badge">Soon</span>';
        return `<li>
          <a href="#${item.hash}" data-nav="${item.id}" class="${active ? 'active' : ''} ${item.live ? '' : 'nav-soon'}">
            ${icon(item.icon, 'nav-icon')}
            <span>${item.label}</span>
            ${badge}
          </a>
        </li>`;
      })
      .join('');
    return `<div class="nav-section"><div class="nav-section-label">${section.label}</div><ul class="sidebar-nav-list">${items}</ul></div>`;
  }).join('');
  return html;
}
