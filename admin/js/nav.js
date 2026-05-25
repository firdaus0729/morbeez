import { icon } from './icons.js';

/** Flat sidebar — matches Morbeez Agriculture dashboard mockup */
export const NAV_ITEMS = [
  { id: 'dashboard', label: 'Dashboard', hash: 'dashboard', icon: 'dashboard', live: true },
  { id: 'products', label: 'Products', hash: 'products', icon: 'products', live: true },
  { id: 'inventory', label: 'Inventory', hash: 'inventory', icon: 'inventory', live: true },
  { id: 'orders', label: 'Orders', hash: 'orders', icon: 'orders', live: true },
  { id: 'offers', label: 'Offers', hash: 'offers', icon: 'offers', live: true },
  { id: 'flash-sales', label: 'Flash Sales', hash: 'flash-sales', icon: 'flash', live: true },
  { id: 'combos', label: 'Combos', hash: 'combos', icon: 'combos', live: true },
  { id: 'ai-advisory', label: 'AI Advisory', hash: 'ai-advisory', icon: 'ai', live: true },
  { id: 'ai-mapping', label: 'AI Mapping', hash: 'ai-mapping', icon: 'ai', live: true },
  { id: 'whatsapp', label: 'WhatsApp', hash: 'whatsapp', icon: 'whatsapp', live: false },
  { id: 'analytics', label: 'Analytics', hash: 'analytics', icon: 'analytics', live: false },
  { id: 'content', label: 'Content', hash: 'content', icon: 'content', live: false },
  { id: 'farmers', label: 'Farmers', hash: 'farmers', icon: 'farmers', live: true },
  { id: 'settings', label: 'Settings', hash: 'settings', icon: 'settings', live: true },
];

export const ROUTE_TITLES = {
  dashboard: 'Dashboard',
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
  whatsapp: 'WhatsApp',
  content: 'Content',
  analytics: 'Analytics',
  staff: 'Staff',
  settings: 'Settings',
};

export function renderSidebarNav(activeRoute) {
  const base = activeRoute.split('/')[0];
  const mainItems = NAV_ITEMS.filter((item) => !item.hidden)
    .map((item) => {
      const active =
        item.id === base ||
        (item.id === 'products' && base === 'products') ||
        (item.id === 'ai-mapping' && base === 'ai-mapping');
      return `<li>
        <a href="#${item.hash}" data-nav="${item.id}" class="sidebar-link ${active ? 'active' : ''}">
          ${icon(item.icon, 'nav-icon')}
          <span>${item.label}</span>
        </a>
      </li>`;
    })
    .join('');

  return `<ul class="sidebar-menu">${mainItems}</ul>`;
}

export function roleLabel(role) {
  const map = { admin: 'Super Admin', manager: 'Manager', viewer: 'Viewer' };
  return map[role] || role;
}
