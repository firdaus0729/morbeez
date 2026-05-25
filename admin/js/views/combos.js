import { $, api, state, escapeHtml, formatInrFull, canEdit, showToast } from '../core.js';
import { icon } from '../icons.js';

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
      <p class="products-showing">Showing <strong>${from}</strong> to <strong>${to}</strong> of <strong>${pg.total}</strong> combos</p>
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

function closeModal() {
  const root = $('#modal-root');
  if (root) {
    root.innerHTML = '';
    root.classList.add('hidden');
  }
}

async function showComboDetail(id) {
  const root = $('#modal-root');
  if (!root) return;
  root.classList.remove('hidden');
  root.innerHTML =
    '<div class="modal-backdrop" id="combo-modal-bg"><div class="modal-card"><div class="products-loading"><div class="spinner"></div></div></div></div>';

  try {
    const data = await api(`/console/api/v1/combos/${id}`);
    const c = data.combo;
    const st = c.status === 'active' ? 'Active' : 'Inactive';
    const tone = c.status === 'active' ? 'active' : 'inactive';
    root.innerHTML = `
      <div class="modal-backdrop" id="combo-modal-bg">
        <div class="modal-card order-detail-modal" role="dialog">
          <div class="modal-header">
            <h2>${escapeHtml(c.name)}</h2>
            <button type="button" class="modal-close" id="combo-modal-close" aria-label="Close">×</button>
          </div>
          <div class="modal-body">
            <dl class="order-detail-grid">
              <div><dt>Products</dt><dd>${escapeHtml(c.productsLabel)}</dd></div>
              <div><dt>MRP</dt><dd>${formatInrFull(c.mrp)}</dd></div>
              <div><dt>Combo price</dt><dd>${formatInrFull(c.comboPrice)}</dd></div>
              <div><dt>Discount</dt><dd>${escapeHtml(c.discountLabel)}</dd></div>
              <div><dt>Status</dt><dd><span class="combo-status combo-status-${tone}">${st}</span></dd></div>
              <div><dt>Sales (MTD)</dt><dd>${formatInrFull(c.salesMtd)}</dd></div>
              ${c.description ? `<div class="order-detail-full"><dt>Description</dt><dd>${escapeHtml(c.description)}</dd></div>` : ''}
            </dl>
          </div>
        </div>
      </div>`;
    $('#combo-modal-close')?.addEventListener('click', closeModal);
    $('#combo-modal-bg')?.addEventListener('click', (ev) => {
      if (ev.target.id === 'combo-modal-bg') closeModal();
    });
  } catch (err) {
    root.innerHTML = `<div class="modal-backdrop"><div class="modal-card"><div class="alert alert-error">${escapeHtml(err.message)}</div></div></div>`;
  }
}

function openComboFormModal(combo, onSaved) {
  const root = $('#modal-root');
  if (!root) return;
  root.classList.remove('hidden');
  const isEdit = Boolean(combo);

  root.innerHTML = `
    <div class="modal-backdrop" id="combo-form-bg">
      <div class="modal-card modal-card-wide" role="dialog">
        <div class="modal-header">
          <h2>${isEdit ? 'Edit combo' : 'Create combo'}</h2>
          <button type="button" class="modal-close" id="combo-form-close" aria-label="Close">×</button>
        </div>
        <form id="combo-form" class="modal-body">
          <div id="combo-form-alert" class="alert alert-error hidden"></div>
          <div class="form-row">
            <div class="field field-full">
              <label>Combo name</label>
              <input name="name" class="input" required value="${escapeHtml(combo?.name || '')}" placeholder="Pest Control Combo" />
            </div>
          </div>
          <div class="form-row">
            <div class="field">
              <label>Products in combo</label>
              <input name="productCount" type="number" min="1" max="50" class="input" required value="${combo?.productCount ?? 3}" />
            </div>
            <div class="field">
              <label>Status</label>
              <select name="status" class="input">
                <option value="active" ${combo?.status !== 'inactive' ? 'selected' : ''}>Active</option>
                <option value="inactive" ${combo?.status === 'inactive' ? 'selected' : ''}>Inactive</option>
              </select>
            </div>
          </div>
          <div class="form-row">
            <div class="field">
              <label>MRP (₹)</label>
              <input name="mrp" type="number" min="0" step="1" class="input" required value="${combo?.mrp ?? ''}" />
            </div>
            <div class="field">
              <label>Combo price (₹)</label>
              <input name="comboPrice" type="number" min="0" step="1" class="input" required value="${combo?.comboPrice ?? ''}" />
            </div>
          </div>
          <div class="field field-full">
            <label>Description</label>
            <input name="description" class="input" value="${escapeHtml(combo?.description || '')}" placeholder="Optional" />
          </div>
          <div class="modal-footer">
            <button type="button" class="btn btn-secondary" id="combo-form-cancel">Cancel</button>
            <button type="submit" class="btn btn-primary">${isEdit ? 'Save changes' : 'Create combo'}</button>
          </div>
        </form>
      </div>
    </div>`;

  const close = () => closeModal();
  $('#combo-form-close')?.addEventListener('click', close);
  $('#combo-form-cancel')?.addEventListener('click', close);
  $('#combo-form-bg')?.addEventListener('click', (ev) => {
    if (ev.target.id === 'combo-form-bg') close();
  });

  $('#combo-form')?.addEventListener('submit', async (ev) => {
    ev.preventDefault();
    const alert = $('#combo-form-alert');
    alert?.classList.add('hidden');
    const fd = new FormData(ev.target);
    const payload = {
      name: fd.get('name'),
      productCount: Number(fd.get('productCount')),
      mrp: Number(fd.get('mrp')),
      comboPrice: Number(fd.get('comboPrice')),
      status: fd.get('status'),
      description: fd.get('description') || undefined,
    };
    try {
      if (isEdit) {
        await api(`/console/api/v1/combos/${combo.id}`, { method: 'PATCH', body: JSON.stringify(payload) });
        showToast('Combo updated');
      } else {
        await api('/console/api/v1/combos', { method: 'POST', body: JSON.stringify(payload) });
        showToast('Combo created');
      }
      close();
      onSaved();
    } catch (err) {
      if (alert) {
        alert.textContent = err.message;
        alert.classList.remove('hidden');
      }
    }
  });
}

export async function renderCombos() {
  const el = $('#main-content');
  el.innerHTML = '<div class="products-loading"><div class="spinner"></div></div>';

  try {
    const q = new URLSearchParams({
      page: String(state.combos.page),
      limit: String(state.combos.limit),
      ...(state.combos.search ? { search: state.combos.search } : {}),
      ...(state.combos.status && state.combos.status !== 'all'
        ? { status: state.combos.status }
        : {}),
    });
    const data = await api(`/console/api/v1/combos?${q}`);
    const pg = data.pagination;
    const stats = data.stats || {
      total: 0,
      active: 0,
      inactive: 0,
      totalSalesMtd: 0,
      salesMonthLabel: 'May',
    };

    const salesLabel = `Total Sales (${stats.salesMonthLabel})`;

    const rows = (data.combos || [])
      .map((c) => {
        const tone = c.status === 'active' ? 'active' : 'inactive';
        const label = c.status === 'active' ? 'Active' : 'Inactive';
        return `
      <tr>
        <td class="col-combo-name"><strong>${escapeHtml(c.name)}</strong></td>
        <td class="col-products">${escapeHtml(c.productsLabel)}</td>
        <td>${formatInrFull(c.mrp)}</td>
        <td class="col-combo-price">${formatInrFull(c.comboPrice)}</td>
        <td class="col-discount">${escapeHtml(c.discountLabel)}</td>
        <td><span class="combo-status combo-status-${tone}">${label}</span></td>
        <td class="col-actions">
          <button type="button" class="action-icon" title="View" data-combo-view="${escapeHtml(c.id)}">${icon('eye', 'icon-action')}</button>
          ${
            canEdit()
              ? `<button type="button" class="action-icon" title="Edit" data-combo-edit="${escapeHtml(c.id)}">${icon('edit', 'icon-action')}</button>`
              : ''
          }
        </td>
      </tr>`;
      })
      .join('');

    const filtersOpen = state.combos.filtersOpen ? 'open' : '';

    el.innerHTML = `
      <div class="combos-page products-page">
        <div class="product-summary-grid">
          ${summaryCard('Total Combos', stats.total, 'default')}
          ${summaryCard('Active Combos', stats.active, 'success')}
          ${summaryCard('Inactive Combos', stats.inactive, 'danger')}
          ${summaryCard(salesLabel, formatInrFull(stats.totalSalesMtd), 'default')}
        </div>

        <div class="products-toolbar combos-toolbar">
          <div class="products-search-wrap combos-search-wrap">
            ${icon('search', 'icon-search-inline')}
            <input type="search" id="combo-search" class="products-search" placeholder="Search combos…" value="${escapeHtml(state.combos.search)}" />
          </div>
          <button type="button" class="btn-filters ${filtersOpen ? 'active' : ''}" id="combos-toggle-filters" aria-expanded="${state.combos.filtersOpen}">
            ${icon('filter', 'icon-filter')}
            Filters
          </button>
        </div>

        <div class="inventory-filters-panel combos-filters-panel ${filtersOpen}" id="combos-filters-panel" ${filtersOpen ? '' : 'hidden'}>
          <label class="inventory-filter-label" for="combo-status-filter">Status</label>
          <select id="combo-status-filter" class="products-select">
            <option value="all" ${state.combos.status === 'all' ? 'selected' : ''}>All statuses</option>
            <option value="active" ${state.combos.status === 'active' ? 'selected' : ''}>Active</option>
            <option value="inactive" ${state.combos.status === 'inactive' ? 'selected' : ''}>Inactive</option>
          </select>
          <button type="button" class="btn btn-primary btn-sm" id="combos-apply-filters">Apply</button>
        </div>

        <div class="products-table-card">
          <div class="table-wrap">
            <table class="products-table combos-table">
              <thead>
                <tr>
                  <th>Combo Name</th>
                  <th>Products</th>
                  <th>MRP</th>
                  <th>Combo Price</th>
                  <th>Discount</th>
                  <th>Status</th>
                  <th class="col-actions-h">Action</th>
                </tr>
              </thead>
              <tbody>${rows || '<tr><td colspan="7" class="empty-state">No combos found</td></tr>'}</tbody>
            </table>
          </div>
          ${renderPagination(pg)}
        </div>
      </div>`;

    const applyFilters = () => {
      state.combos.search = $('#combo-search')?.value.trim() || '';
      state.combos.status = $('#combo-status-filter')?.value || 'all';
      state.combos.page = 1;
      renderCombos();
    };

    $('#combos-toggle-filters')?.addEventListener('click', () => {
      state.combos.filtersOpen = !state.combos.filtersOpen;
      const panel = $('#combos-filters-panel');
      const btn = $('#combos-toggle-filters');
      if (panel) {
        panel.hidden = !state.combos.filtersOpen;
        panel.classList.toggle('open', state.combos.filtersOpen);
      }
      btn?.classList.toggle('active', state.combos.filtersOpen);
      btn?.setAttribute('aria-expanded', String(state.combos.filtersOpen));
    });

    $('#combos-apply-filters')?.addEventListener('click', applyFilters);
    $('#combo-search')?.addEventListener('keydown', (ev) => {
      if (ev.key === 'Enter') applyFilters();
    });

    el.querySelectorAll('[data-combo-view]').forEach((btn) => {
      btn.addEventListener('click', () => showComboDetail(btn.dataset.comboView));
    });

    el.querySelectorAll('[data-combo-edit]').forEach((btn) => {
      btn.addEventListener('click', async () => {
        try {
          const data = await api(`/console/api/v1/combos/${btn.dataset.comboEdit}`);
          openComboFormModal(data.combo, () => renderCombos());
        } catch (err) {
          showToast(err.message, 'error');
        }
      });
    });

    const footer = el.querySelector('.products-table-footer');
    if (footer) {
      bindPagination(footer, pg, (p) => {
        state.combos.page = p;
        renderCombos();
        window.scrollTo({ top: 0, behavior: 'smooth' });
      });
    }
  } catch (err) {
    el.innerHTML = `<div class="alert alert-error">${escapeHtml(err.message)}</div>`;
  }
}

export function bindCombosTopbar() {
  if (!canEdit()) return;
  $('#topbar-actions').innerHTML =
    '<button type="button" class="btn btn-primary btn-sm btn-add-product" id="btn-create-combo">' +
    icon('plus', 'icon-btn') +
    ' Create Combo</button>';
  $('#btn-create-combo')?.addEventListener('click', () => {
    openComboFormModal(null, () => renderCombos());
  });
}
