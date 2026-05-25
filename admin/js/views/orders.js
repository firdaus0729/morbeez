import { $, api, state, escapeHtml, formatInrFull } from '../core.js';
import { icon } from '../icons.js';

const TABS = [
  { id: 'all', label: 'All Orders' },
  { id: 'pending', label: 'Pending' },
  { id: 'processing', label: 'Processing' },
  { id: 'shipped', label: 'Shipped' },
  { id: 'delivered', label: 'Delivered' },
  { id: 'cancelled', label: 'Cancelled' },
];

const STATUS_UI = {
  pending: { label: 'Pending', tone: 'pending' },
  processing: { label: 'Processing', tone: 'processing' },
  shipped: { label: 'Shipped', tone: 'shipped' },
  delivered: { label: 'Delivered', tone: 'delivered' },
  cancelled: { label: 'Cancelled', tone: 'cancelled' },
};

function formatOrderDate(iso) {
  if (!iso) return '—';
  try {
    return new Date(iso).toLocaleDateString('en-IN', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
    });
  } catch {
    return iso;
  }
}

function buildPageNumbers(current, total) {
  if (total <= 7) {
    return Array.from({ length: total }, (_, i) => i + 1);
  }
  const pages = new Set([1, total, current, current - 1, current + 1]);
  const sorted = [...pages].filter((p) => p >= 1 && p <= total).sort((a, b) => a - b);
  const out = [];
  for (let i = 0; i < sorted.length; i++) {
    if (i > 0 && sorted[i] - sorted[i - 1] > 1) out.push('…');
    out.push(sorted[i]);
  }
  return out;
}

function renderPagination(pg) {
  const from = pg.total === 0 ? 0 : (pg.page - 1) * pg.limit + 1;
  const to = Math.min(pg.page * pg.limit, pg.total);
  const pageItems = buildPageNumbers(pg.page, pg.pages);

  const nums = pageItems
    .map((n) =>
      n === '…'
        ? '<span class="page-ellipsis">…</span>'
        : `<button type="button" class="page-num ${n === pg.page ? 'active' : ''}" data-page-num="${n}">${n}</button>`
    )
    .join('');

  return `
    <div class="products-table-footer">
      <p class="products-showing">Showing <strong>${from}</strong> to <strong>${to}</strong> of <strong>${pg.total}</strong> orders</p>
      <div class="products-pager">
        <button type="button" class="pager-btn" data-page="prev" ${pg.page <= 1 ? 'disabled' : ''}>← Previous</button>
        <div class="pager-nums">${nums}</div>
        <button type="button" class="pager-btn" data-page="next" ${pg.page >= pg.pages ? 'disabled' : ''}>Next →</button>
      </div>
    </div>`;
}

function bindPagination(root, pg, onChange) {
  root.querySelectorAll('[data-page]').forEach((btn) => {
    btn.addEventListener('click', () => {
      if (btn.disabled) return;
      const dir = btn.dataset.page;
      if (dir === 'prev') onChange(pg.page - 1);
      if (dir === 'next') onChange(pg.page + 1);
    });
  });
  root.querySelectorAll('[data-page-num]').forEach((btn) => {
    btn.addEventListener('click', () => onChange(Number(btn.dataset.pageNum)));
  });
}

function renderTabs(tabCounts) {
  return TABS.map((tab) => {
    const count = tabCounts?.[tab.id] ?? 0;
    const active = state.orders.status === tab.id ? 'active' : '';
    return `<button type="button" class="orders-tab ${active}" data-order-tab="${tab.id}">
      ${escapeHtml(tab.label)} <span class="orders-tab-count">(${count})</span>
    </button>`;
  }).join('');
}

export async function renderOrders() {
  const el = $('#main-content');
  el.innerHTML = '<div class="products-loading"><div class="spinner"></div></div>';

  try {
    const q = new URLSearchParams({
      page: String(state.orders.page),
      limit: String(state.orders.limit),
      ...(state.orders.search ? { search: state.orders.search } : {}),
      ...(state.orders.status && state.orders.status !== 'all'
        ? { status: state.orders.status }
        : {}),
      ...(state.orders.payment ? { payment: state.orders.payment } : {}),
    });
    const data = await api(`/console/api/v1/orders?${q}`);
    const pg = data.pagination;
    const tabCounts = data.tabCounts || {};

    const rows = (data.orders || [])
      .map((o) => {
        const st = STATUS_UI[o.status] || STATUS_UI.processing;
        return `
      <tr>
        <td class="col-order-id"><strong>${escapeHtml(o.displayOrderId)}</strong></td>
        <td class="col-farmer">${escapeHtml(o.farmerName)}</td>
        <td class="col-amount">${formatInrFull(o.amount)}</td>
        <td class="col-payment">${escapeHtml(o.paymentLabel)}</td>
        <td class="col-center"><span class="order-status order-status-${st.tone}">${escapeHtml(st.label)}</span></td>
        <td class="col-date">${escapeHtml(formatOrderDate(o.createdAt))}</td>
        <td class="col-actions">
          <button type="button" class="action-icon" title="View details" data-order-view="${escapeHtml(o.id)}">${icon('eye', 'icon-action')}</button>
        </td>
      </tr>`;
      })
      .join('');

    const filtersOpen = state.orders.filtersOpen ? 'open' : '';

    el.innerHTML = `
      <div class="orders-page products-page">
        <nav class="orders-tabs" aria-label="Order status">${renderTabs(tabCounts)}</nav>

        <div class="products-toolbar orders-toolbar">
          <div class="products-search-wrap orders-search-wrap">
            ${icon('search', 'icon-search-inline')}
            <input type="search" id="order-search" class="products-search" placeholder="Search orders…" value="${escapeHtml(state.orders.search)}" />
          </div>
          <button type="button" class="btn-filters ${filtersOpen ? 'active' : ''}" id="orders-toggle-filters" aria-expanded="${state.orders.filtersOpen}">
            ${icon('filter', 'icon-filter')}
            Filters
          </button>
        </div>

        <div class="orders-filters-panel inventory-filters-panel ${filtersOpen}" id="orders-filters-panel" ${filtersOpen ? '' : 'hidden'}>
          <label class="inventory-filter-label" for="order-payment-filter">Payment</label>
          <select id="order-payment-filter" class="products-select">
            <option value="" ${!state.orders.payment ? 'selected' : ''}>All payments</option>
            <option value="cod" ${state.orders.payment === 'cod' ? 'selected' : ''}>COD only</option>
            <option value="paid" ${state.orders.payment === 'paid' ? 'selected' : ''}>Paid only</option>
          </select>
          <button type="button" class="btn btn-primary btn-sm" id="orders-apply-filters">Apply</button>
        </div>

        <div class="products-table-card">
          <div class="table-wrap">
            <table class="products-table orders-table">
              <thead>
                <tr>
                  <th>Order ID</th>
                  <th>Farmer</th>
                  <th>Amount</th>
                  <th>Payment</th>
                  <th class="col-center">Status</th>
                  <th>Date</th>
                  <th class="col-actions-h">Action</th>
                </tr>
              </thead>
              <tbody>${rows || '<tr><td colspan="7" class="empty-state">No orders found</td></tr>'}</tbody>
            </table>
          </div>
          ${renderPagination(pg)}
        </div>
      </div>`;

    el.querySelectorAll('[data-order-tab]').forEach((btn) => {
      btn.addEventListener('click', () => {
        state.orders.status = btn.dataset.orderTab;
        state.orders.page = 1;
        renderOrders();
      });
    });

    const applyFilters = () => {
      state.orders.search = $('#order-search')?.value.trim() || '';
      state.orders.payment = $('#order-payment-filter')?.value || '';
      state.orders.page = 1;
      renderOrders();
    };

    $('#orders-toggle-filters')?.addEventListener('click', () => {
      state.orders.filtersOpen = !state.orders.filtersOpen;
      const panel = $('#orders-filters-panel');
      const btn = $('#orders-toggle-filters');
      if (panel) {
        panel.hidden = !state.orders.filtersOpen;
        panel.classList.toggle('open', state.orders.filtersOpen);
      }
      btn?.classList.toggle('active', state.orders.filtersOpen);
      btn?.setAttribute('aria-expanded', String(state.orders.filtersOpen));
    });

    $('#orders-apply-filters')?.addEventListener('click', applyFilters);
    $('#order-search')?.addEventListener('keydown', (ev) => {
      if (ev.key === 'Enter') applyFilters();
    });

    el.querySelectorAll('[data-order-view]').forEach((btn) => {
      btn.addEventListener('click', () => {
        location.hash = `orders/detail/${btn.dataset.orderView}`;
      });
    });

    const footer = el.querySelector('.products-table-footer');
    if (footer) {
      bindPagination(footer, pg, (p) => {
        state.orders.page = p;
        renderOrders();
        window.scrollTo({ top: 0, behavior: 'smooth' });
      });
    }
  } catch (err) {
    el.innerHTML = `<div class="alert alert-error">${escapeHtml(err.message)}</div>`;
  }
}
