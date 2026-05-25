import { $, api, state, escapeHtml, canEdit } from '../core.js';
import { icon } from '../icons.js';

function productStatusLabel(p) {
  if (p.status !== 'active' || (p.inventory ?? 0) === 0) {
    return { label: 'Inactive', tone: 'inactive' };
  }
  return { label: 'Active', tone: 'active' };
}

function summaryCard(label, value, tone) {
  return `<div class="product-summary-card">
    <span class="product-summary-label">${escapeHtml(label)}</span>
    <span class="product-summary-value product-summary-${tone}">${escapeHtml(String(value))}</span>
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

function renderProductsPagination(pg) {
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
      <p class="products-showing">Showing <strong>${from}</strong> to <strong>${to}</strong> of <strong>${pg.total}</strong> products</p>
      <div class="products-pager">
        <button type="button" class="pager-btn" data-page="prev" ${pg.page <= 1 ? 'disabled' : ''}>← Previous</button>
        <div class="pager-nums">${nums}</div>
        <button type="button" class="pager-btn" data-page="next" ${pg.page >= pg.pages ? 'disabled' : ''}>Next →</button>
      </div>
    </div>`;
}

function bindProductsPagination(root, pg, onChange) {
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

export async function renderProducts() {
  const el = $('#main-content');
  el.innerHTML = '<div class="products-loading"><div class="spinner"></div></div>';

  try {
    const q = new URLSearchParams({
      page: String(state.products.page),
      limit: String(state.products.limit),
      ...(state.products.search ? { search: state.products.search } : {}),
      ...(state.products.category ? { category: state.products.category } : {}),
      ...(state.products.status ? { status: state.products.status } : {}),
    });
    const data = await api(`/console/api/v1/products?${q}`);
    const pg = data.pagination;
    const stats = data.stats || { total: 0, active: 0, lowStock: 0, outOfStock: 0 };
    const categories = data.categories || [];

    const categoryOptions = [
      '<option value="">All Categories</option>',
      ...categories.map(
        (c) =>
          `<option value="${escapeHtml(c)}" ${state.products.category === c ? 'selected' : ''}>${escapeHtml(c)}</option>`
      ),
    ].join('');

    const rows = data.products
      .map((p) => {
        const st = productStatusLabel(p);
        return `
      <tr>
        <td class="col-product">
          <div class="product-cell">
            ${
              p.imageUrl
                ? `<img class="product-row-img" src="${escapeHtml(p.imageUrl)}" alt="" loading="lazy" />`
                : '<span class="product-row-img product-row-img--empty"></span>'
            }
            <span class="product-row-title">${escapeHtml(p.title)}</span>
          </div>
        </td>
        <td class="col-category">${escapeHtml(p.category || '—')}</td>
        <td class="col-center">${p.variantCount ?? 1}</td>
        <td class="col-center col-stock ${p.inventory === 0 ? 'stock-zero' : p.inventory <= 10 ? 'stock-low' : ''}">${p.inventory ?? 0}</td>
        <td class="col-center"><span class="status-pill status-${st.tone}">${escapeHtml(st.label)}</span></td>
        <td class="col-actions">
          <a href="#products/edit/${p.id}" class="action-icon" title="View">${icon('eye', 'icon-action')}</a>
          ${
            canEdit()
              ? `<a href="#products/edit/${p.id}" class="action-icon" title="Edit">${icon('edit', 'icon-action')}</a>`
              : ''
          }
        </td>
      </tr>`;
      })
      .join('');

    el.innerHTML = `
      <div class="products-page">
        <div class="product-summary-grid">
          ${summaryCard('Total Products', stats.total, 'default')}
          ${summaryCard('Active', stats.active, 'success')}
          ${summaryCard('Low Stock', stats.lowStock, 'warn')}
          ${summaryCard('Out of Stock', stats.outOfStock, 'danger')}
        </div>

        <div class="products-toolbar">
          <div class="products-search-wrap">
            ${icon('search', 'icon-search-inline')}
            <input type="search" id="product-search" class="products-search" placeholder="Search products…" value="${escapeHtml(state.products.search)}" />
          </div>
          <select id="product-category" class="products-select" aria-label="Category">${categoryOptions}</select>
          <select id="product-status" class="products-select" aria-label="Status">
            <option value="">All Status</option>
            <option value="active" ${state.products.status === 'active' ? 'selected' : ''}>Active</option>
            <option value="draft" ${state.products.status === 'draft' ? 'selected' : ''}>Draft</option>
            <option value="archived" ${state.products.status === 'archived' ? 'selected' : ''}>Archived</option>
          </select>
          <button type="button" class="btn-filters" id="product-apply-filters">
            ${icon('filter', 'icon-filter')}
            Filters
          </button>
        </div>

        <div class="products-table-card">
          <div class="table-wrap">
            <table class="products-table">
              <thead>
                <tr>
                  <th>Product</th>
                  <th>Category</th>
                  <th class="col-center">Variants</th>
                  <th class="col-center">Stock</th>
                  <th class="col-center">Status</th>
                  <th class="col-actions-h">Action</th>
                </tr>
              </thead>
              <tbody>${rows || '<tr><td colspan="6" class="empty-state">No products found</td></tr>'}</tbody>
            </table>
          </div>
          ${renderProductsPagination(pg)}
        </div>
      </div>`;

    const applyFilters = () => {
      state.products.search = $('#product-search')?.value.trim() || '';
      state.products.category = $('#product-category')?.value || '';
      state.products.status = $('#product-status')?.value || '';
      state.products.page = 1;
      renderProducts();
    };

    $('#product-apply-filters')?.addEventListener('click', applyFilters);
    $('#product-search')?.addEventListener('keydown', (ev) => {
      if (ev.key === 'Enter') applyFilters();
    });
    $('#product-category')?.addEventListener('change', applyFilters);
    $('#product-status')?.addEventListener('change', applyFilters);

    const footer = el.querySelector('.products-table-footer');
    if (footer) {
      bindProductsPagination(footer, pg, (p) => {
        state.products.page = p;
        renderProducts();
        window.scrollTo({ top: 0, behavior: 'smooth' });
      });
    }
  } catch (err) {
    el.innerHTML = `<div class="alert alert-error">${escapeHtml(err.message)}</div>`;
  }
}
