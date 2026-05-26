/** Shared Morbeez console utilities */
export const TOKEN_KEY = 'morbeez_admin_token';
export const API_BASE = window.location.origin;

export const state = {
  admin: null,
  route: 'login',
  routeParams: {},
  farmers: {
    page: 1,
    limit: 8,
    search: '',
    status: 'all',
    state: '',
    filtersOpen: false,
    states: [],
  },
  products: { page: 1, limit: 8, search: '', category: '', status: '' },
  inventory: { page: 1, limit: 8, search: '', status: 'all', filtersOpen: false },
  orders: { page: 1, limit: 8, search: '', status: 'all', payment: '', filtersOpen: false },
  offers: { tab: 'all' },
  combos: { page: 1, limit: 7, search: '', status: 'all', filtersOpen: false },
  flashSales: { tab: 'all', page: 1, viewAll: false },
  aiAdvisory: { showLogs: false, logsPage: 1 },
  aiMapping: { tab: 'crop', page: 1, limit: 7, search: '', filter: '', filtersOpen: false },
  telecaller: {
    scope: 'all',
    stage: 'all',
    search: '',
    selectedLeadId: null,
    detailTab: 'overview',
    leadTab: 'overview',
    blockId: 'a',
    blockTab: 'overview',
    ffLimit: 10,
    ffPage: 1,
    page: 1,
    navBadges: { followUpTasks: 0 },
    crmFilters: {
      interactions: { type: '', status: '', blockId: '' },
      recommendations: { status: '' },
      findings: { blockId: '' },
    },
  },
};

export function $(sel, root = document) {
  return root.querySelector(sel);
}

export function escapeHtml(s) {
  if (s == null) return '';
  return String(s)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

export function formatDate(iso) {
  if (!iso) return '—';
  try {
    return new Date(iso).toLocaleString('en-IN', { dateStyle: 'medium', timeStyle: 'short' });
  } catch {
    return iso;
  }
}

export function formatInr(amount) {
  const n = Number(amount);
  if (Number.isNaN(n)) return '—';
  return '₹' + n.toLocaleString('en-IN', { minimumFractionDigits: 0, maximumFractionDigits: 2 });
}

/** Indian grouping e.g. ₹24,58,320 */
export function formatInrFull(amount) {
  const n = Number(amount);
  if (Number.isNaN(n)) return '—';
  return '₹' + n.toLocaleString('en-IN', { maximumFractionDigits: 0 });
}

export function formatTrend(pct) {
  const n = Number(pct);
  if (Number.isNaN(n)) return { text: '—', up: true };
  const up = n >= 0;
  return { text: `${up ? '+' : ''}${n}%`, up };
}

export function initials(name) {
  if (!name) return 'A';
  const parts = String(name).trim().split(/\s+/);
  return parts.length >= 2
    ? (parts[0][0] + parts[1][0]).toUpperCase()
    : (parts[0].slice(0, 2) || 'A').toUpperCase();
}

export function dateRangeLabel() {
  const end = new Date();
  const start = new Date();
  start.setDate(start.getDate() - 6);
  const fmt = (d) =>
    d.toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });
  return `${fmt(start)} – ${fmt(end)}`;
}

export function canEdit() {
  return state.admin && ['admin', 'manager'].includes(state.admin.role);
}

export function isAdmin() {
  return state.admin?.role === 'admin';
}

export function renderPagination(pagination) {
  if (!pagination || pagination.total === 0) return '';
  if (pagination.pages <= 1) {
    return `<div class="pagination"><span class="pagination-meta">Showing all ${pagination.total} items</span></div>`;
  }
  const { page, pages, total, limit } = pagination;
  const from = (page - 1) * limit + 1;
  const to = Math.min(page * limit, total);
  return `
    <div class="pagination">
      <button type="button" class="btn btn-secondary btn-sm" data-page="prev" ${page <= 1 ? 'disabled' : ''}>Previous</button>
      <span class="pagination-meta">Showing ${from}–${to} of ${total} (page ${page} / ${pages})</span>
      <button type="button" class="btn btn-secondary btn-sm" data-page="next" ${page >= pages ? 'disabled' : ''}>Next</button>
    </div>`;
}

export function bindPagination(root, pagination, onChange) {
  root.querySelectorAll('[data-page]').forEach((btn) => {
    btn.addEventListener('click', () => {
      if (btn.disabled) return;
      const dir = btn.dataset.page;
      if (dir === 'prev') onChange(pagination.page - 1);
      if (dir === 'next') onChange(pagination.page + 1);
    });
  });
}

export function readFileAsBase64(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result);
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

export function showToast(msg, type = 'success') {
  const el = $('#toast');
  el.textContent = msg;
  el.className = `toast toast-${type}`;
  el.classList.remove('hidden');
  clearTimeout(showToast._t);
  showToast._t = setTimeout(() => el.classList.add('hidden'), 4000);
}

export async function api(path, options = {}) {
  const headers = { 'Content-Type': 'application/json', ...(options.headers || {}) };
  const token = localStorage.getItem(TOKEN_KEY);
  if (token) headers.Authorization = `Bearer ${token}`;

  const res = await fetch(`${API_BASE}${path}`, { ...options, headers });
  let data;
  try {
    data = await res.json();
  } catch {
    data = { message: res.statusText };
  }

  if (res.status === 401 && path !== '/console/api/v1/auth/login') {
    logout();
    throw new Error('Session expired. Please sign in again.');
  }
  if (!res.ok) {
    throw new Error(data.message || data.error || 'Request failed');
  }
  return data;
}

export function logout() {
  localStorage.removeItem(TOKEN_KEY);
  state.admin = null;
  window.dispatchEvent(new CustomEvent('morbeez:navigate', { detail: { route: 'login' } }));
}

export function collectIntelFields(form, section) {
  const out = {};
  form.querySelectorAll(`[data-intel-section="${section}"]`).forEach((el) => {
    const key = el.getAttribute('name');
    if (!key) return;
    if (el.type === 'checkbox') out[key] = el.checked;
    else out[key] = el.value?.trim?.() ?? el.value;
  });
  return out;
}

export function fillIntelFields(form, section, data = {}) {
  form.querySelectorAll(`[data-intel-section="${section}"]`).forEach((el) => {
    const key = el.getAttribute('name');
    if (!key || data[key] == null) return;
    if (el.type === 'checkbox') el.checked = Boolean(data[key]);
    else el.value = data[key];
  });
}

export function fieldHtml(label, name, section, opts = {}) {
  const { type = 'text', value = '', placeholder = '', rows, options, hint } = opts;
  const id = `${section}-${name}`;
  let input = '';
  if (type === 'textarea') {
    input = `<textarea id="${id}" name="${name}" data-intel-section="${section}" class="input" rows="${rows || 3}" placeholder="${escapeHtml(placeholder)}">${escapeHtml(value)}</textarea>`;
  } else if (type === 'select' && options) {
    input = `<select id="${id}" name="${name}" data-intel-section="${section}" class="input">${options
      .map(
        (o) =>
          `<option value="${escapeHtml(o.value)}" ${String(value) === String(o.value) ? 'selected' : ''}>${escapeHtml(o.label)}</option>`
      )
      .join('')}</select>`;
  } else {
    input = `<input id="${id}" name="${name}" type="${type}" data-intel-section="${section}" class="input" value="${escapeHtml(value)}" placeholder="${escapeHtml(placeholder)}" />`;
  }
  return `<div class="field">
    <label for="${id}">${escapeHtml(label)}</label>
    ${input}
    ${hint ? `<p class="field-hint">${escapeHtml(hint)}</p>` : ''}
  </div>`;
}
