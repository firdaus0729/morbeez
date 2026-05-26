import { TOKEN_KEY, $, api, state, logout, initials, dateRangeLabel, canEdit } from './core.js';
import { renderSidebarNav, ROUTE_TITLES, roleLabel, bindSidebarGroups } from './nav.js';
import { renderTelecallerWorkspace } from './views/telecaller-workspace.js';
import { renderTelecallerLeadDetail, bindTelecallerCrmTopbar } from './views/telecaller-lead-detail.js';
import { renderTelecallerFollowups } from './views/telecaller-followups.js';
import { renderTelecallerCalls } from './views/telecaller-calls.js';
import { renderWhatsAppCrm } from './views/whatsapp-crm.js';
import { initSearchPalette } from './search-palette.js';
import { icon } from './icons.js';
import { renderDashboard } from './views/dashboard.js';
import { renderProducts } from './views/products.js';
import { renderInventory } from './views/inventory.js';
import { renderProductWizard } from './views/product-wizard.js';
import { renderFarmers, bindFarmersTopbar } from './views/farmers.js';
import { renderOrders } from './views/orders.js';
import { renderOrderDetail, bindOrderDetailTopbar } from './views/order-detail.js';
import { renderOffers, bindOffersTopbar } from './views/offers.js';
import { renderCombos, bindCombosTopbar } from './views/combos.js';
import { renderFlashSales, bindFlashSalesTopbar, teardownFlashSales } from './views/flash-sales.js';
import { renderAiAdvisory, bindAiAdvisoryTopbar, teardownAiAdvisory } from './views/ai-advisory.js';
import { renderAiMapping, bindAiMappingTopbar } from './views/ai-mapping.js';
import { renderStaff } from './views/staff.js';
import { renderModulePlaceholder, renderSettings } from './views/placeholder.js';

const PLACEHOLDER_ROUTES = new Set([
  'whatsapp',
  'content',
  'analytics',
]);

function injectTopbarIcons() {
  const search = $('#btn-search');
  const bell = $('#btn-notify');
  if (search && !search.innerHTML.trim()) search.innerHTML = icon('search', 'icon-tool');
  if (bell && !bell.querySelector('svg')) {
    bell.innerHTML = icon('bell', 'icon-tool') + '<span class="bell-dot"></span>';
  }
}

function updateUserChrome() {
  const admin = state.admin;
  if (!admin) return;
  const name = admin.fullName || admin.email?.split('@')[0] || 'Admin';
  const ini = initials(name);
  const role = roleLabel(admin.role);

  const set = (id, text) => {
    const el = $(id);
    if (el) el.textContent = text;
  };

  set('#sidebar-user-name', name);
  set('#sidebar-user-role', role);
  set('#topbar-admin-label', name.split(' ')[0]);
  set('#topbar-date-text', dateRangeLabel());

  ['#sidebar-avatar', '#topbar-avatar'].forEach((sel) => {
    const el = $(sel);
    if (el) el.textContent = ini;
  });
}

function updateSidebar(route) {
  const nav = $('#sidebar-nav');
  if (nav) nav.innerHTML = renderSidebarNav(route);
  nav?.querySelectorAll('[data-nav]').forEach((a) => {
    a.addEventListener('click', () => setTimeout(onHashChange, 0));
  });
}

function navigate(route, params = {}) {
  if (state.route === 'flash-sales' && route !== 'flash-sales') teardownFlashSales();
  if (state.route === 'ai-advisory' && route !== 'ai-advisory') teardownAiAdvisory();
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
  document.body.classList.toggle('route-dashboard', route === 'dashboard');
  document.body.classList.toggle('route-products', route === 'products');
  document.body.classList.toggle('route-inventory', route === 'inventory');
  document.body.classList.toggle('route-orders', route === 'orders' || route === 'orders/detail');
  document.body.classList.toggle('route-order-detail', route === 'orders/detail');
  document.body.classList.toggle('route-offers', route === 'offers');
  document.body.classList.toggle('route-combos', route === 'combos');
  document.body.classList.toggle('route-flash-sales', route === 'flash-sales');
  document.body.classList.toggle('route-ai-advisory', route === 'ai-advisory');
  document.body.classList.toggle('route-ai-mapping', route === 'ai-mapping');
  document.body.classList.toggle('route-farmers', route === 'farmers');
  document.body.classList.toggle(
    'route-telecaller',
    route === 'telecaller' || route.startsWith('telecaller/')
  );
  document.body.classList.toggle('route-lead-detail', route === 'telecaller/lead');
  document.body.classList.toggle('route-whatsapp-crm', route === 'whatsapp-crm');
  document.body.classList.toggle(
    'route-product-wizard',
    route === 'products/new' || route === 'products/edit'
  );
  updateSidebar(route);
  bindSidebarGroups($('#sidebar-nav'));
  updateUserChrome();

  const isCrmRoute = route === 'telecaller' || route.startsWith('telecaller/');
  if (isCrmRoute) {
    bindTelecallerCrmTopbar();
  } else {
    injectTopbarIcons();
  }

  const base = route.split('/')[0];
  let titleKey = route;
  if (route.startsWith('products/edit')) titleKey = 'products/edit';
  if (route.startsWith('products/new')) titleKey = 'products/new';
  if (route.startsWith('orders/detail')) titleKey = 'orders/detail';
  if (route.startsWith('telecaller/')) titleKey = route;

  const pageTitle = $('#page-title');
  if (pageTitle) {
    pageTitle.textContent = ROUTE_TITLES[titleKey] || ROUTE_TITLES[base] || 'Console';
    pageTitle.classList.toggle('hidden', route === 'telecaller/lead');
  }
  $('#topbar-actions').innerHTML = '';
  $('#main-content').innerHTML = '';

  if (route === 'dashboard') renderDashboard();
  else if (route === 'products') {
    if (canEdit()) {
      $('#topbar-actions').innerHTML =
        '<a href="#products/new" class="btn btn-primary btn-sm btn-add-product">' +
        icon('plus', 'icon-btn') +
        ' Add Product</a>';
    }
    renderProducts();
  }
  else if (route === 'products/new') renderProductWizard();
  else if (route === 'products/edit') renderProductWizard(params.id);
  else if (route === 'inventory') renderInventory();
  else if (route === 'telecaller') {
    renderTelecallerWorkspace();
  }
  else if (route === 'telecaller/lead') {
    renderTelecallerLeadDetail(params.id);
  }
  else if (route === 'telecaller/followups') renderTelecallerFollowups();
  else if (route === 'telecaller/calls') renderTelecallerCalls();
  else if (route === 'whatsapp-crm') renderWhatsAppCrm();
  else if (route === 'farmers') {
    bindFarmersTopbar();
    renderFarmers();
  }
  else if (route === 'orders') renderOrders();
  else if (route === 'orders/detail') {
    bindOrderDetailTopbar();
    renderOrderDetail(params.id);
  }
  else if (route === 'offers') {
    bindOffersTopbar();
    renderOffers();
  }
  else if (route === 'combos') {
    bindCombosTopbar();
    renderCombos();
  }
  else if (route === 'flash-sales') {
    bindFlashSalesTopbar();
    renderFlashSales();
  }
  else if (route === 'ai-advisory') {
    bindAiAdvisoryTopbar();
    renderAiAdvisory();
  }
  else if (route === 'ai-mapping') {
    bindAiMappingTopbar();
    renderAiMapping();
  }
  else if (route === 'staff') renderStaff();
  else if (route === 'settings') $('#main-content').innerHTML = renderSettings();
  else if (PLACEHOLDER_ROUTES.has(base)) {
    $('#main-content').innerHTML = renderModulePlaceholder(base);
  } else {
    $('#main-content').innerHTML = '<div class="alert alert-error">Page not found</div>';
  }
}

async function loadNavBadges() {
  try {
    const data = await api('/console/api/v1/telecaller/nav-badges');
    window.__navBadges = data.badges || {};
    state.telecaller.navBadges = data.badges || {};
  } catch {
    window.__navBadges = {};
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
    await loadNavBadges();
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
  } else if (hash.startsWith('orders/detail/')) {
    navigate('orders/detail', { id: hash.split('/')[2] });
  } else if (hash.startsWith('telecaller/lead/')) {
    navigate('telecaller/lead', { id: hash.split('/')[2] });
  } else {
    navigate(hash);
  }
}

$('#sidebar-profile-btn')?.addEventListener('click', () => {
  $('#btn-logout')?.classList.toggle('hidden');
});

$('#login-form')?.addEventListener('submit', handleLogin);
$('#btn-logout')?.addEventListener('click', () => {
  logout();
  $('#btn-logout')?.classList.add('hidden');
});
$('#btn-sidebar')?.addEventListener('click', () => document.body.classList.toggle('sidebar-open'));
window.addEventListener('hashchange', onHashChange);
window.addEventListener('morbeez:navigate', (e) => navigate(e.detail.route));

injectTopbarIcons();
initSearchPalette();

if (localStorage.getItem(TOKEN_KEY)) {
  initSession();
} else {
  navigate('login');
}
