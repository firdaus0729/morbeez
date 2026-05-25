import { $, api, state, escapeHtml, canEdit, showToast } from '../core.js';
import { icon } from '../icons.js';

function summaryCard(label, value, tone) {
  return `<div class="product-summary-card">
    <span class="product-summary-label">${escapeHtml(label)}</span>
    <span class="product-summary-value product-summary-${tone}">${escapeHtml(String(value))}</span>
  </div>`;
}

function formatFarmerDate(iso) {
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
      <p class="products-showing">Showing <strong>${from}</strong> to <strong>${to}</strong> of <strong>${pg.total.toLocaleString('en-IN')}</strong> farmers</p>
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

function farmerCell(f) {
  const hue = f.avatarHue ?? 140;
  return `
    <div class="farmer-cell">
      <span class="farmer-avatar" style="--avatar-hue:${hue}" aria-hidden="true">${escapeHtml(f.initials || 'F')}</span>
      <strong class="farmer-name">${escapeHtml(f.displayName)}</strong>
    </div>`;
}

function closeModal() {
  const root = $('#modal-root');
  if (root) {
    root.innerHTML = '';
    root.classList.add('hidden');
  }
}

function openFarmerFormModal(farmer, onSaved) {
  const root = $('#modal-root');
  if (!root) return;
  root.classList.remove('hidden');
  const isEdit = Boolean(farmer);

  root.innerHTML = `
    <div class="modal-backdrop" id="farmer-form-bg">
      <div class="modal-card modal-card-wide" role="dialog">
        <div class="modal-header">
          <h2>${isEdit ? 'Edit farmer' : 'Add farmer'}</h2>
          <button type="button" class="modal-close" id="farmer-form-close" aria-label="Close">×</button>
        </div>
        <form id="farmer-form" class="modal-body">
          <div id="farmer-form-alert" class="alert alert-error hidden"></div>
          <div class="form-row">
            <div class="field">
              <label>First name</label>
              <input name="firstName" class="input" value="${escapeHtml(farmer?.firstName || '')}" />
            </div>
            <div class="field">
              <label>Last name</label>
              <input name="lastName" class="input" value="${escapeHtml(farmer?.lastName || '')}" />
            </div>
          </div>
          <div class="form-row">
            <div class="field">
              <label>Mobile ${isEdit ? '' : '*'}</label>
              <input name="phone" class="input" ${isEdit ? '' : 'required'} value="${escapeHtml(farmer?.phone || '')}" placeholder="10-digit mobile" />
            </div>
            <div class="field">
              <label>State</label>
              <input name="state" class="input" value="${escapeHtml(farmer?.state || '')}" placeholder="Maharashtra" />
            </div>
          </div>
          <div class="field">
            <label>District</label>
            <input name="district" class="input" value="${escapeHtml(farmer?.district || '')}" />
          </div>
          ${
            !isEdit
              ? `<div class="field field-full">
            <label>Crops</label>
            <input name="crops" class="input" placeholder="Paddy, Wheat" />
            <p class="field-hint">Comma-separated crop names</p>
          </div>`
              : ''
          }
          ${
            isEdit
              ? `<div class="field">
            <label class="checkbox-label"><input type="checkbox" name="newsletterSubscribed" ${farmer.newsletterSubscribed ? 'checked' : ''} /> Newsletter subscribed</label>
          </div>`
              : ''
          }
          <div class="modal-footer">
            <button type="button" class="btn btn-secondary" id="farmer-form-cancel">Cancel</button>
            <button type="submit" class="btn btn-primary">${isEdit ? 'Save changes' : 'Add farmer'}</button>
          </div>
        </form>
      </div>
    </div>`;

  const close = () => closeModal();
  $('#farmer-form-close')?.addEventListener('click', close);
  $('#farmer-form-cancel')?.addEventListener('click', close);
  $('#farmer-form-bg')?.addEventListener('click', (ev) => {
    if (ev.target.id === 'farmer-form-bg') close();
  });

  $('#farmer-form')?.addEventListener('submit', async (ev) => {
    ev.preventDefault();
    const alert = $('#farmer-form-alert');
    alert?.classList.add('hidden');
    const fd = new FormData(ev.target);

    try {
      if (isEdit) {
        await api(`/console/api/v1/farmers/${farmer.id}`, {
          method: 'PATCH',
          body: JSON.stringify({
            firstName: fd.get('firstName') || undefined,
            lastName: fd.get('lastName') || undefined,
            phone: fd.get('phone') || undefined,
            district: fd.get('district') || undefined,
            state: fd.get('state') || undefined,
            newsletterSubscribed: fd.get('newsletterSubscribed') === 'on',
          }),
        });
        showToast('Farmer updated');
      } else {
        await api('/console/api/v1/farmers', {
          method: 'POST',
          body: JSON.stringify({
            phone: fd.get('phone'),
            firstName: fd.get('firstName') || undefined,
            lastName: fd.get('lastName') || undefined,
            state: fd.get('state') || undefined,
            district: fd.get('district') || undefined,
            crops: fd.get('crops') || undefined,
          }),
        });
        showToast('Farmer added');
      }
      close();
      onSaved();
    } catch (err) {
      if (alert) {
        alert.textContent = err.message;
        alert.classList.remove('hidden');
      } else {
        showToast(err.message, 'error');
      }
    }
  });
}

async function openFarmerEdit(id) {
  try {
    const data = await api(`/console/api/v1/farmers/${id}`);
    openFarmerFormModal(data.farmer, () => renderFarmers());
  } catch (err) {
    showToast(err.message, 'error');
  }
}

export function bindFarmersTopbar() {
  if (!canEdit()) return;
  $('#topbar-actions').innerHTML =
    '<button type="button" class="btn btn-primary btn-sm btn-add-product" id="btn-add-farmer">' +
    icon('plus', 'icon-btn') +
    ' Add Farmer</button>';
  $('#btn-add-farmer')?.addEventListener('click', () => {
    openFarmerFormModal(null, () => renderFarmers());
  });
}

export async function renderFarmers() {
  const el = $('#main-content');
  el.innerHTML = '<div class="products-loading"><div class="spinner"></div></div>';

  try {
    const q = new URLSearchParams({
      page: String(state.farmers.page),
      limit: String(state.farmers.limit),
      ...(state.farmers.search ? { search: state.farmers.search } : {}),
      ...(state.farmers.status && state.farmers.status !== 'all'
        ? { status: state.farmers.status }
        : {}),
      ...(state.farmers.state ? { state: state.farmers.state } : {}),
    });

    const [data, statesData] = await Promise.all([
      api(`/console/api/v1/farmers?${q}`),
      state.farmers.states?.length
        ? Promise.resolve({ states: state.farmers.states })
        : api('/console/api/v1/farmers/states').catch(() => ({ states: [] })),
    ]);

    if (statesData.states?.length) state.farmers.states = statesData.states;

    const pg = data.pagination;
    const stats = data.stats || {
      total: pg.total,
      active: 0,
      newThisMonth: 0,
      repeatBuyers: 0,
    };

    const rows = (data.farmers || [])
      .map((f) => {
        const tone = f.status === 'active' ? 'active' : 'inactive';
        const label = f.status === 'active' ? 'Active' : 'Inactive';
        return `
      <tr>
        <td class="col-farmer">${farmerCell(f)}</td>
        <td class="col-mobile">${escapeHtml(f.phone || '—')}</td>
        <td>${escapeHtml(f.state || '—')}</td>
        <td class="col-crops">${escapeHtml(f.cropsLabel || '—')}</td>
        <td>${formatFarmerDate(f.lastOrderAt)}</td>
        <td><span class="farmer-status farmer-status-${tone}">${label}</span></td>
        <td class="col-actions">
          ${
            canEdit()
              ? `<button type="button" class="action-icon" title="Edit" data-edit-farmer="${escapeHtml(f.id)}">${icon('edit', 'icon-action')}</button>`
              : '—'
          }
        </td>
      </tr>`;
      })
      .join('');

    const filtersOpen = state.farmers.filtersOpen ? 'open' : '';
    const stateOptions = (state.farmers.states || [])
      .map(
        (s) =>
          `<option value="${escapeHtml(s)}" ${state.farmers.state === s ? 'selected' : ''}>${escapeHtml(s)}</option>`
      )
      .join('');

    el.innerHTML = `
      <div class="farmers-page products-page">
        <div class="product-summary-grid">
          ${summaryCard('Total Farmers', Number(stats.total).toLocaleString('en-IN'), 'default')}
          ${summaryCard('Active Farmers', Number(stats.active).toLocaleString('en-IN'), 'success')}
          ${summaryCard('New This Month', Number(stats.newThisMonth).toLocaleString('en-IN'), 'default')}
          ${summaryCard('Repeat Buyers', Number(stats.repeatBuyers).toLocaleString('en-IN'), 'default')}
        </div>

        <div class="products-toolbar farmers-toolbar">
          <div class="products-search-wrap farmers-search-wrap">
            ${icon('search', 'icon-search-inline')}
            <input type="search" id="farmer-search" class="products-search" placeholder="Search farmer…" value="${escapeHtml(state.farmers.search)}" />
          </div>
          <button type="button" class="btn-filters ${filtersOpen ? 'active' : ''}" id="farmers-toggle-filters" aria-expanded="${state.farmers.filtersOpen}">
            ${icon('filter', 'icon-filter')}
            Filters
          </button>
        </div>

        <div class="inventory-filters-panel farmers-filters-panel ${filtersOpen}" id="farmers-filters-panel" ${filtersOpen ? '' : 'hidden'}>
          <label class="inventory-filter-label" for="farmer-status-filter">Status</label>
          <select id="farmer-status-filter" class="products-select">
            <option value="all" ${state.farmers.status === 'all' ? 'selected' : ''}>All statuses</option>
            <option value="active" ${state.farmers.status === 'active' ? 'selected' : ''}>Active</option>
            <option value="inactive" ${state.farmers.status === 'inactive' ? 'selected' : ''}>Inactive</option>
          </select>
          <label class="inventory-filter-label" for="farmer-state-filter">State</label>
          <select id="farmer-state-filter" class="products-select">
            <option value="">All states</option>
            ${stateOptions}
          </select>
          <button type="button" class="btn btn-primary btn-sm" id="farmers-apply-filters">Apply</button>
        </div>

        <div class="products-table-card">
          <div class="table-wrap">
            <table class="products-table farmers-table">
              <thead>
                <tr>
                  <th>Farmer</th>
                  <th>Mobile</th>
                  <th>Location</th>
                  <th>Crops</th>
                  <th>Last Order</th>
                  <th>Status</th>
                  <th class="col-actions-h">Action</th>
                </tr>
              </thead>
              <tbody>${rows || '<tr><td colspan="7" class="empty-state">No farmers found</td></tr>'}</tbody>
            </table>
          </div>
          ${renderPagination(pg)}
        </div>
      </div>`;

    const applyFilters = () => {
      state.farmers.search = $('#farmer-search')?.value.trim() || '';
      state.farmers.status = $('#farmer-status-filter')?.value || 'all';
      state.farmers.state = $('#farmer-state-filter')?.value || '';
      state.farmers.page = 1;
      renderFarmers();
    };

    $('#farmers-toggle-filters')?.addEventListener('click', () => {
      state.farmers.filtersOpen = !state.farmers.filtersOpen;
      const panel = $('#farmers-filters-panel');
      const btn = $('#farmers-toggle-filters');
      if (panel) {
        panel.hidden = !state.farmers.filtersOpen;
        panel.classList.toggle('open', state.farmers.filtersOpen);
      }
      btn?.classList.toggle('active', state.farmers.filtersOpen);
      btn?.setAttribute('aria-expanded', String(state.farmers.filtersOpen));
    });

    $('#farmers-apply-filters')?.addEventListener('click', applyFilters);
    $('#farmer-search')?.addEventListener('keydown', (ev) => {
      if (ev.key === 'Enter') applyFilters();
    });

    el.querySelectorAll('[data-edit-farmer]').forEach((btn) => {
      btn.addEventListener('click', () => openFarmerEdit(btn.dataset.editFarmer));
    });

    const footer = el.querySelector('.products-table-footer');
    if (footer) {
      bindPagination(footer, pg, (p) => {
        state.farmers.page = p;
        renderFarmers();
        window.scrollTo({ top: 0, behavior: 'smooth' });
      });
    }
  } catch (err) {
    el.innerHTML = `<div class="alert alert-error">${escapeHtml(err.message)}</div>`;
  }
}
