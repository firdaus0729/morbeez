import {
  $,
  api,
  state,
  escapeHtml,
  formatDate,
  canEdit,
  renderPagination,
  bindPagination,
  showToast,
} from '../core.js';

export async function renderFarmers() {
  const el = $('#main-content');
  el.innerHTML = '<p class="loading">Loading farmers…</p>';

  try {
    const q = new URLSearchParams({
      page: String(state.farmers.page),
      limit: '25',
      ...(state.farmers.search ? { search: state.farmers.search } : {}),
    });
    const data = await api(`/console/api/v1/farmers?${q}`);
    const pg = data.pagination;

    const rows = data.farmers
      .map((f) => {
        const name = [f.firstName, f.lastName].filter(Boolean).join(' ') || f.name || '—';
        return `
      <tr>
        <td><strong>${escapeHtml(name)}</strong></td>
        <td>${escapeHtml(f.email || '—')}</td>
        <td>${escapeHtml(f.phone || '—')}</td>
        <td>${escapeHtml(f.district || '—')}</td>
        <td>${escapeHtml(f.state || '—')}</td>
        <td>${formatDate(f.lastLoginAt || f.createdAt)}</td>
        <td>${canEdit() ? `<button type="button" class="btn btn-secondary btn-sm" data-edit-farmer="${f.id}">Edit</button>` : '—'}</td>
      </tr>`;
      })
      .join('');

    el.innerHTML = `
      <div class="panel">
        <div class="panel-header">
          <h3>Farmer CRM <span class="muted" style="font-weight:400">(${pg.total} registered)</span></h3>
          <div class="toolbar">
            <input type="search" id="farmer-search" placeholder="Search email, name, phone…" value="${escapeHtml(state.farmers.search)}" />
            <button type="button" class="btn btn-secondary btn-sm" id="farmer-search-btn">Search</button>
          </div>
        </div>
        <div class="table-wrap">
          <table>
            <thead><tr><th>Name</th><th>Email</th><th>Phone</th><th>District</th><th>State</th><th>Activity</th><th></th></tr></thead>
            <tbody>${rows || '<tr><td colspan="7" class="empty-state">No farmers found</td></tr>'}</tbody>
          </table>
        </div>
        ${renderPagination(pg)}
      </div>`;

    $('#farmer-search-btn')?.addEventListener('click', () => {
      state.farmers.search = $('#farmer-search').value.trim();
      state.farmers.page = 1;
      renderFarmers();
    });
    bindPagination(el, pg, (p) => {
      state.farmers.page = p;
      renderFarmers();
    });

    el.querySelectorAll('[data-edit-farmer]').forEach((btn) => {
      btn.addEventListener('click', () => openFarmerModal(btn.dataset.editFarmer));
    });
  } catch (err) {
    el.innerHTML = `<div class="alert alert-error">${escapeHtml(err.message)}</div>`;
  }
}

async function openFarmerModal(id) {
  const root = $('#modal-root');
  root.innerHTML = '<div class="modal-backdrop"><div class="modal"><p>Loading…</p></div></div>';
  try {
    const { farmer } = await api(`/console/api/v1/farmers/${id}`);
    root.innerHTML = `
      <div class="modal-backdrop" id="modal-close-bg">
        <div class="modal modal-lg">
          <h3>Edit farmer</h3>
          <form id="farmer-form">
            <div class="form-row">
              <div class="field"><label>First name</label><input name="firstName" class="input" value="${escapeHtml(farmer.firstName || '')}" /></div>
              <div class="field"><label>Last name</label><input name="lastName" class="input" value="${escapeHtml(farmer.lastName || '')}" /></div>
            </div>
            <div class="field"><label>Phone</label><input name="phone" class="input" value="${escapeHtml(farmer.phone || '')}" /></div>
            <div class="form-row">
              <div class="field"><label>District</label><input name="district" class="input" value="${escapeHtml(farmer.district || '')}" /></div>
              <div class="field"><label>State</label><input name="state" class="input" value="${escapeHtml(farmer.state || '')}" /></div>
            </div>
            <div class="field">
              <label class="checkbox-label"><input type="checkbox" name="newsletterSubscribed" ${farmer.newsletterSubscribed ? 'checked' : ''} /> Newsletter subscribed</label>
            </div>
            <div class="modal-actions">
              <button type="button" class="btn btn-secondary" id="modal-cancel">Cancel</button>
              <button type="submit" class="btn btn-primary">Save</button>
            </div>
          </form>
        </div>
      </div>`;

    $('#modal-cancel').onclick = () => (root.innerHTML = '');
    $('#modal-close-bg').onclick = (e) => {
      if (e.target.id === 'modal-close-bg') root.innerHTML = '';
    };
    $('#farmer-form').onsubmit = async (e) => {
      e.preventDefault();
      const fd = new FormData(e.target);
      try {
        await api(`/console/api/v1/farmers/${id}`, {
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
        root.innerHTML = '';
        showToast('Farmer updated');
        renderFarmers();
      } catch (err) {
        showToast(err.message, 'error');
      }
    };
  } catch (err) {
    root.innerHTML = '';
    showToast(err.message, 'error');
  }
}
