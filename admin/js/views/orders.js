import {
  $,
  api,
  state,
  escapeHtml,
  formatDate,
  formatInr,
  renderPagination,
  bindPagination,
} from '../core.js';

export async function renderOrders() {
  const el = $('#main-content');
  el.innerHTML = '<p class="loading">Loading orders…</p>';

  try {
    const q = new URLSearchParams({
      page: String(state.orders.page),
      limit: '25',
      ...(state.orders.search ? { search: state.orders.search } : {}),
    });
    const data = await api(`/console/api/v1/orders?${q}`);
    const pg = data.pagination;

    const rows = data.orders
      .map(
        (o) => `
      <tr>
        <td><strong>${escapeHtml(o.orderName || '—')}</strong><br><small class="muted">${escapeHtml(o.source)}</small></td>
        <td>${escapeHtml(o.email || '—')}</td>
        <td>${escapeHtml(o.phone || '—')}</td>
        <td>${formatInr(o.totalAmount)} <small class="muted">${escapeHtml(o.currency || 'INR')}</small></td>
        <td><span class="badge badge-${o.financialStatus === 'paid' ? 'active' : 'draft'}">${escapeHtml(o.financialStatus || '—')}</span></td>
        <td>${formatDate(o.createdAt)}</td>
      </tr>`
      )
      .join('');

    el.innerHTML = `
      <div class="panel">
        <div class="panel-header">
          <h3>Orders <span class="muted" style="font-weight:400">(${pg.total})</span></h3>
          <div class="toolbar">
            <input type="search" id="order-search" placeholder="Search order, email, phone…" value="${escapeHtml(state.orders.search)}" />
            <button type="button" class="btn btn-secondary btn-sm" id="order-search-btn">Search</button>
          </div>
        </div>
        <div class="table-wrap">
          <table>
            <thead><tr><th>Order</th><th>Email</th><th>Phone</th><th>Total</th><th>Status</th><th>Date</th></tr></thead>
            <tbody>${rows || '<tr><td colspan="6" class="empty-state">No orders found</td></tr>'}</tbody>
          </table>
        </div>
        ${renderPagination(pg)}
      </div>`;

    $('#order-search-btn')?.addEventListener('click', () => {
      state.orders.search = $('#order-search').value.trim();
      state.orders.page = 1;
      renderOrders();
    });
    bindPagination(el, pg, (p) => {
      state.orders.page = p;
      renderOrders();
    });
  } catch (err) {
    el.innerHTML = `<div class="alert alert-error">${escapeHtml(err.message)}</div>`;
  }
}
