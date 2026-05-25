import { $, api, state, escapeHtml, formatInrFull, canEdit } from '../core.js';
import { icon } from '../icons.js';

const STATUS_LABELS = {
  in_stock: { label: 'In Stock', tone: 'in-stock' },
  low_stock: { label: 'Low Stock', tone: 'low-stock' },
  out_of_stock: { label: 'Out of Stock', tone: 'out-stock' },
};

function summaryCard(label, value, tone, unit = '') {
  const unitHtml = unit
    ? ` <span class="summary-unit">${escapeHtml(unit)}</span>`
    : '';
  return `<div class="product-summary-card">
    <span class="product-summary-label">${escapeHtml(label)}</span>
    <span class="product-summary-value product-summary-${tone}">${escapeHtml(String(value))}${unitHtml}</span>
  </div>`;
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
      <p class="products-showing">Showing <strong>${from}</strong> to <strong>${to}</strong> of <strong>${pg.total}</strong> line items</p>
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

export async function renderInventory() {
  const el = $('#main-content');
  el.innerHTML = '<div class="products-loading"><div class="spinner"></div></div>';

  try {
    const q = new URLSearchParams({
      page: String(state.inventory.page),
      limit: String(state.inventory.limit),
      ...(state.inventory.search ? { search: state.inventory.search } : {}),
      ...(state.inventory.status && state.inventory.status !== 'all'
        ? { status: state.inventory.status }
        : {}),
    });
    const data = await api(`/console/api/v1/inventory?${q}`);
    const pg = data.pagination;
    const stats = data.stats || {
      totalStockValue: 0,
      totalStock: 0,
      lowStockProducts: 0,
      outOfStockProducts: 0,
    };

    const rows = (data.rows || [])
      .map((r) => {
        const st = STATUS_LABELS[r.status] || STATUS_LABELS.in_stock;
        const stockClass =
          r.status === 'out_of_stock'
            ? 'stock-zero'
            : r.status === 'low_stock'
              ? 'stock-low'
              : '';
        return `
      <tr>
        <td class="col-product">
          <div class="product-cell">
            ${
              r.imageUrl
                ? `<img class="product-row-img" src="${escapeHtml(r.imageUrl)}" alt="" loading="lazy" />`
                : '<span class="product-row-img product-row-img--empty"></span>'
            }
            <span class="product-row-title">${escapeHtml(r.title)}</span>
          </div>
        </td>
        <td class="col-variant">${escapeHtml(r.variant)}</td>
        <td class="col-batch"><code class="batch-code">${escapeHtml(r.batchNo)}</code></td>
        <td class="col-expiry">${escapeHtml(r.expiryDate)}</td>
        <td class="col-center col-stock ${stockClass}">${r.stock}</td>
        <td class="col-center"><span class="inv-status inv-status-${st.tone}">${escapeHtml(st.label)}</span></td>
        <td class="col-actions">
          <a href="#products/edit/${escapeHtml(r.productId)}" class="action-icon" title="View">${icon('eye', 'icon-action')}</a>
          ${
            canEdit()
              ? `<a href="#products/edit/${escapeHtml(r.productId)}" class="action-icon" title="Edit">${icon('edit', 'icon-action')}</a>`
              : ''
          }
        </td>
      </tr>`;
      })
      .join('');

    const filtersOpen = state.inventory.filtersOpen ? 'open' : '';

    el.innerHTML = `
      <div class="inventory-page products-page">
        <div class="product-summary-grid">
          ${summaryCard('Total Stock Value', formatInrFull(stats.totalStockValue), 'default')}
          ${summaryCard('Total Stock', stats.totalStock.toLocaleString('en-IN'), 'success', 'Units')}
          ${summaryCard('Low Stock', stats.lowStockProducts, 'warn', 'Products')}
          ${summaryCard('Out of Stock', stats.outOfStockProducts, 'danger', 'Products')}
        </div>

        <div class="products-toolbar inventory-toolbar">
          <div class="products-search-wrap inventory-search-wrap">
            ${icon('search', 'icon-search-inline')}
            <input type="search" id="inventory-search" class="products-search" placeholder="Search products…" value="${escapeHtml(state.inventory.search)}" />
          </div>
          <button type="button" class="btn-filters ${filtersOpen ? 'active' : ''}" id="inventory-toggle-filters" aria-expanded="${state.inventory.filtersOpen}">
            ${icon('filter', 'icon-filter')}
            Filters
          </button>
        </div>

        <div class="inventory-filters-panel ${filtersOpen}" id="inventory-filters-panel" ${filtersOpen ? '' : 'hidden'}>
          <label class="inventory-filter-label" for="inventory-status">Stock status</label>
          <select id="inventory-status" class="products-select">
            <option value="all" ${state.inventory.status === 'all' ? 'selected' : ''}>All statuses</option>
            <option value="in_stock" ${state.inventory.status === 'in_stock' ? 'selected' : ''}>In Stock</option>
            <option value="low_stock" ${state.inventory.status === 'low_stock' ? 'selected' : ''}>Low Stock</option>
            <option value="out_of_stock" ${state.inventory.status === 'out_of_stock' ? 'selected' : ''}>Out of Stock</option>
          </select>
          <button type="button" class="btn btn-primary btn-sm" id="inventory-apply-filters">Apply</button>
        </div>

        <div class="products-table-card">
          <div class="table-wrap">
            <table class="products-table inventory-table">
              <thead>
                <tr>
                  <th>Product</th>
                  <th>Variant</th>
                  <th>Batch No</th>
                  <th>Expiry Date</th>
                  <th class="col-center">Stock</th>
                  <th class="col-center">Status</th>
                  <th class="col-actions-h">Action</th>
                </tr>
              </thead>
              <tbody>${rows || '<tr><td colspan="7" class="empty-state">No inventory rows found</td></tr>'}</tbody>
            </table>
          </div>
          ${renderPagination(pg)}
        </div>
      </div>`;

    const applyFilters = () => {
      state.inventory.search = $('#inventory-search')?.value.trim() || '';
      state.inventory.status = $('#inventory-status')?.value || 'all';
      state.inventory.page = 1;
      renderInventory();
    };

    $('#inventory-toggle-filters')?.addEventListener('click', () => {
      state.inventory.filtersOpen = !state.inventory.filtersOpen;
      const panel = $('#inventory-filters-panel');
      const btn = $('#inventory-toggle-filters');
      if (panel) {
        panel.hidden = !state.inventory.filtersOpen;
        panel.classList.toggle('open', state.inventory.filtersOpen);
      }
      btn?.classList.toggle('active', state.inventory.filtersOpen);
      btn?.setAttribute('aria-expanded', String(state.inventory.filtersOpen));
    });

    $('#inventory-apply-filters')?.addEventListener('click', applyFilters);
    $('#inventory-search')?.addEventListener('keydown', (ev) => {
      if (ev.key === 'Enter') applyFilters();
    });

    const footer = el.querySelector('.products-table-footer');
    if (footer) {
      bindPagination(footer, pg, (p) => {
        state.inventory.page = p;
        renderInventory();
        window.scrollTo({ top: 0, behavior: 'smooth' });
      });
    }
  } catch (err) {
    el.innerHTML = `<div class="alert alert-error">${escapeHtml(err.message)}</div>`;
  }
}
