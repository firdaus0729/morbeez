import { TOKEN_KEY, $, api, state, logout, canEdit } from './core.js';
import { renderSidebarNav, ROUTE_TITLES } from './nav.js';
import { icon } from './icons.js';
import { renderDashboard } from './views/dashboard.js';
import { renderProducts, renderProductForm, renderInventory } from './views/products.js';
import { renderFarmers } from './views/farmers.js';
import { renderOrders } from './views/orders.js';
import { renderStaff } from './views/staff.js';
import { renderModulePlaceholder, renderSettings } from './views/placeholder.js';

const PLACEHOLDER_ROUTES = new Set([
  'offers',
  'combos',
  'flash-sales',
  'ai-advisory',
  'whatsapp',
  'content',
  'analytics',
]);

function updateSidebar(route) {
  const nav = $('#sidebar-nav');
  if (nav) nav.innerHTML = renderSidebarNav(route);
  nav?.querySelectorAll('[data-nav]').forEach((a) => {
    a.addEventListener('click', () => setTimeout(onHashChange, 0));
  });
}

function navigate(route, params = {}) {
  state.route = route;
  state.routeParams = params;

  if (route === 'login') {
    $('#view-login').classList.remove('hidden');
    $('#view-app').classList.add('hidden');
    return;
  }

  if (!localStorage.getItem(TOKEN_KEY)) {
    navigate('login');
    return;
  }

  $('#view-login').classList.add('hidden');
  $('#view-app').classList.remove('hidden');
  updateSidebar(route);

  const base = route.split('/')[0];
  let titleKey = route;
  if (route.startsWith('products/edit')) titleKey = 'products/edit';
  if (route.startsWith('products/new')) titleKey = 'products/new';

  $('#page-title').textContent = ROUTE_TITLES[titleKey] || ROUTE_TITLES[base] || 'Console';
  $('#topbar-actions').innerHTML = '';
  $('#main-content').innerHTML = '';

  if (route === 'dashboard') renderDashboard();
  else if (route === 'products') renderProducts();
  else if (route === 'products/new') renderProductForm();
  else if (route === 'products/edit') renderProductForm(params.id);
  else if (route === 'inventory') renderInventory();
  else if (route === 'farmers') renderFarmers();
  else if (route === 'orders') renderOrders();
  else if (route === 'staff') renderStaff();
  else if (route === 'settings') $('#main-content').innerHTML = renderSettings();
  else if (PLACEHOLDER_ROUTES.has(base)) {
    $('#main-content').innerHTML = renderModulePlaceholder(base);
  } else {
    $('#main-content').innerHTML = '<div class="alert alert-error">Page not found</div>';
  }
}

async function initSession() {
  const token = localStorage.getItem(TOKEN_KEY);
  if (!token) {
    navigate('login');
    return;
  }
  try {
    const data = await api('/console/api/v1/auth/me');
    state.admin = data.admin;
    const u = $('#sidebar-user');
    if (u) {
      u.innerHTML = `<strong>${data.admin.fullName || data.admin.email}</strong><span>${data.admin.role}</span>`;
    }
    onHashChange();
  } catch {
    navigate('login');
  }
}

async function handleLogin(e) {
  e.preventDefault();
  const alert = $('#login-alert');
  alert.classList.add('hidden');
  const btn = $('#login-submit');
  btn.disabled = true;
  btn.textContent = 'Signing in…';

  try {
    const data = await api('/console/api/v1/auth/login', {
      method: 'POST',
      body: JSON.stringify({
        email: $('#login-email').value,
        password: $('#login-password').value,
      }),
    });
    localStorage.setItem(TOKEN_KEY, data.token);
    state.admin = data.admin;
    location.hash = 'dashboard';
    await initSession();
  } catch (err) {
    alert.textContent = err.message;
    alert.classList.remove('hidden');
  } finally {
    btn.disabled = false;
    btn.textContent = 'Sign in';
  }
}

function onHashChange() {
  const hash = location.hash.slice(1) || 'dashboard';
  if (!localStorage.getItem(TOKEN_KEY) && hash !== 'login') {
    navigate('login');
    return;
  }
  if (hash.startsWith('products/edit/')) {
    navigate('products/edit', { id: hash.split('/')[2] });
  } else if (hash === 'products/new') {
    navigate('products/new');
  } else {
    navigate(hash);
  }
}

function toggleSidebar() {
  document.body.classList.toggle('sidebar-open');
}

$('#login-form')?.addEventListener('submit', handleLogin);
$('#btn-logout')?.addEventListener('click', logout);
$('#btn-sidebar')?.addEventListener('click', toggleSidebar);
window.addEventListener('hashchange', onHashChange);
window.addEventListener('morbeez:navigate', (e) => navigate(e.detail.route));

if (localStorage.getItem(TOKEN_KEY)) {
  initSession();
} else {
  navigate('login');
}
