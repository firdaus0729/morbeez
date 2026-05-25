/**
 * Morbeez staff console — /console
 */
const TOKEN_KEY = 'morbeez_admin_token';
const API_BASE = window.location.origin;

const state = {
  admin: null,
  route: 'login',
  farmers: { page: 1, search: '' },
  products: { page: 1, limit: 50, search: '' },
};

function $(sel, root = document) {
  return root.querySelector(sel);
}

function escapeHtml(s) {
  if (s == null) return '';
  return String(s)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function formatDate(iso) {
  if (!iso) return '—';
  try {
    return new Date(iso).toLocaleString('en-IN', { dateStyle: 'medium', timeStyle: 'short' });
  } catch {
    return iso;
  }
}

function canEdit() {
  return state.admin && ['admin', 'manager'].includes(state.admin.role);
}

function renderPagination(pagination) {
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

function bindPagination(root, pagination, onChange) {
  root.querySelectorAll('[data-page]').forEach((btn) => {
    btn.addEventListener('click', () => {
      if (btn.disabled) return;
      const dir = btn.dataset.page;
      if (dir === 'prev') onChange(pagination.page - 1);
      if (dir === 'next') onChange(pagination.page + 1);
    });
  });
}

function readFileAsBase64(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result);
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

function showToast(msg, type = 'success') {
  const el = $('#toast');
  el.textContent = msg;
  el.className = `toast toast-${type}`;
  el.classList.remove('hidden');
  clearTimeout(showToast._t);
  showToast._t = setTimeout(() => el.classList.add('hidden'), 4000);
}

async function api(path, options = {}) {
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

function logout() {
  localStorage.removeItem(TOKEN_KEY);
  state.admin = null;
  navigate('login');
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

  document.querySelectorAll('[data-nav]').forEach((a) => {
    a.classList.toggle('active', a.dataset.nav === route.split('/')[0]);
  });

  const titles = {
    dashboard: 'Dashboard',
    products: 'Products',
    'products/new': 'New product',
    'products/edit': 'Edit product',
    farmers: 'Farmers',
  };
  $('#page-title').textContent = titles[route] || 'Admin';
  $('#topbar-actions').innerHTML = '';

  if (route === 'dashboard') renderDashboard();
  else if (route === 'products') renderProducts();
  else if (route === 'products/new') renderProductForm();
  else if (route === 'products/edit') renderProductForm(params.id);
  else if (route === 'farmers') renderFarmers();
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
    $('#sidebar-user').textContent = `${data.admin.fullName || data.admin.email} · ${data.admin.role}`;
    const hash = location.hash.slice(1) || 'dashboard';
    navigate(hash.startsWith('products/edit/') ? 'products/edit' : hash, {
      id: hash.split('/')[2],
    });
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
    $('#sidebar-user').textContent = `${data.admin.fullName || data.admin.email} · ${data.admin.role}`;
    location.hash = 'dashboard';
    navigate('dashboard');
  } catch (err) {
    alert.textContent = err.message;
    alert.classList.remove('hidden');
  } finally {
    btn.disabled = false;
    btn.textContent = 'Sign in';
  }
}

async function renderDashboard() {
  const el = $('#main-content');
  el.innerHTML = '<p class="loading">Loading…</p>';
  try {
    const { stats } = await api('/console/api/v1/stats');
    el.innerHTML = `
      <div class="stats-grid">
        <div class="stat-card"><div class="label">Registered farmers</div><div class="value">${stats.farmers}</div></div>
        <div class="stat-card"><div class="label">Shopify products</div><div class="value">${stats.products}</div></div>
      </div>
      <div class="panel">
        <div class="panel-header"><h3>Quick actions</h3></div>
        <div style="padding:22px;display:flex;gap:12px;flex-wrap:wrap">
          <a href="#products" class="btn btn-primary btn-sm">Manage products</a>
          <a href="#farmers" class="btn btn-secondary btn-sm">View farmers</a>
          ${canEdit() ? '<a href="#products/new" class="btn btn-secondary btn-sm">Add product</a>' : ''}
        </div>
      </div>`;
  } catch (err) {
    el.innerHTML = `<div class="alert alert-error">${escapeHtml(err.message)}</div>`;
  }
}

async function renderProducts() {
  const el = $('#main-content');
  el.innerHTML = '<p class="loading">Loading all products from Shopify…</p>';

  if (canEdit()) {
    $('#topbar-actions').innerHTML = '<a href="#products/new" class="btn btn-primary btn-sm">+ New product</a>';
  }

  try {
    const q = new URLSearchParams({
      page: String(state.products.page),
      limit: String(state.products.limit),
      ...(state.products.search ? { search: state.products.search } : {}),
    });
    const data = await api(`/console/api/v1/products?${q}`);
    const pg = data.pagination;

    const rows = data.products
      .map(
        (p) => `
      <tr>
        <td>${p.imageUrl ? `<img class="product-thumb" src="${escapeHtml(p.imageUrl)}" alt="" loading="lazy" />` : '<span class="product-thumb product-thumb--empty"></span>'}</td>
        <td><strong>${escapeHtml(p.title)}</strong><br><small class="muted">${escapeHtml(p.handle)}</small></td>
        <td>₹${escapeHtml(p.price || '0')}</td>
        <td><span class="badge badge-${escapeHtml(p.status)}">${escapeHtml(p.status)}</span></td>
        <td>${escapeHtml(p.vendor || '—')}</td>
        <td>${formatDate(p.updatedAt)}</td>
        <td>
          ${canEdit() ? `<a href="#products/edit/${p.id}" class="btn btn-secondary btn-sm">Edit</a>` : '—'}
        </td>
      </tr>`
      )
      .join('');

    el.innerHTML = `
      <div class="panel">
        <div class="panel-header">
          <h3>Shopify products <span class="muted" style="font-weight:400">(${pg.total} total)</span></h3>
          <div class="toolbar">
            <input type="search" id="product-search" placeholder="Search title, handle, vendor, tags…" value="${escapeHtml(state.products.search)}" />
            <select id="product-limit" class="toolbar-select" aria-label="Per page">
              <option value="25" ${state.products.limit === 25 ? 'selected' : ''}>25 / page</option>
              <option value="50" ${state.products.limit === 50 ? 'selected' : ''}>50 / page</option>
              <option value="100" ${state.products.limit === 100 ? 'selected' : ''}>100 / page</option>
            </select>
            <button type="button" class="btn btn-secondary btn-sm" id="product-search-btn">Search</button>
          </div>
        </div>
        <div class="table-wrap">
          <table>
            <thead><tr><th></th><th>Product</th><th>Price</th><th>Status</th><th>Vendor</th><th>Updated</th><th></th></tr></thead>
            <tbody>${rows || '<tr><td colspan="7" class="empty-state">No products found</td></tr>'}</tbody>
          </table>
        </div>
        ${renderPagination(pg)}
      </div>`;

    const applyFilters = () => {
      state.products.search = $('#product-search').value.trim();
      state.products.limit = Number($('#product-limit').value) || 50;
      state.products.page = 1;
      renderProducts();
    };

    $('#product-search-btn')?.addEventListener('click', applyFilters);
    $('#product-search')?.addEventListener('keydown', (ev) => {
      if (ev.key === 'Enter') applyFilters();
    });
    $('#product-limit')?.addEventListener('change', applyFilters);

    bindPagination(el, pg, (p) => {
      state.products.page = p;
      renderProducts();
    });
  } catch (err) {
    el.innerHTML = `<div class="alert alert-error">${escapeHtml(err.message)}</div>`;
  }
}

function productImagesHtml(product) {
  if (!product?.id) {
    return `<p class="muted text-sm">Save the product first, then you can upload images.</p>`;
  }
  const imgs = product.images?.length ? product.images : product.imageUrl ? [{ id: '', src: product.imageUrl }] : [];
  const gallery = imgs
    .map(
      (img) => `
    <div class="product-image-card" data-image-id="${escapeHtml(img.id)}">
      <img src="${escapeHtml(img.src)}" alt="" />
      ${img.id && canEdit() ? `<button type="button" class="btn btn-danger btn-sm product-image-remove" data-image-id="${escapeHtml(img.id)}">Remove</button>` : ''}
    </div>`
    )
    .join('');

  return `
    <div class="field product-images-field">
      <label>Product images</label>
      <div class="product-image-gallery">${gallery || '<p class="muted">No images yet</p>'}</div>
      ${
        canEdit()
          ? `<div class="product-image-upload">
          <input type="file" id="product-image-file" accept="image/jpeg,image/png,image/webp,image/gif" />
          <input type="text" id="product-image-alt" placeholder="Alt text (optional)" class="mt-2" style="width:100%" />
          <button type="button" class="btn btn-secondary btn-sm mt-2" id="product-image-upload-btn">Upload image</button>
        </div>`
          : ''
      }
    </div>`;
}

function productFormHtml(product = null) {
  const p = product || {};
  return `
    <form id="product-form" class="panel" style="max-width:800px">
      <div class="panel-header"><h3>${product?.id ? 'Edit product' : 'New product'}</h3></div>
      <div style="padding:22px">
        ${productImagesHtml(p)}
        <div class="field"><label>Title *</label><input name="title" required value="${escapeHtml(p.title || '')}" /></div>
        <div class="field"><label>Description (HTML)</label><textarea name="bodyHtml" rows="4">${escapeHtml(p.bodyHtml || '')}</textarea></div>
        <div class="form-row">
          <div class="field"><label>Price (₹)</label><input name="price" type="text" value="${escapeHtml(p.price || '')}" placeholder="0.00" /></div>
          <div class="field"><label>SKU</label><input name="sku" value="${escapeHtml(p.sku || '')}" /></div>
        </div>
        <div class="form-row">
          <div class="field"><label>Status</label>
            <select name="status">
              <option value="draft" ${p.status === 'draft' ? 'selected' : ''}>Draft</option>
              <option value="active" ${p.status === 'active' ? 'selected' : ''}>Active</option>
              <option value="archived" ${p.status === 'archived' ? 'selected' : ''}>Archived</option>
            </select>
          </div>
          <div class="field"><label>Vendor</label><input name="vendor" value="${escapeHtml(p.vendor || 'Morbeez')}" /></div>
        </div>
        <div class="field"><label>Product type</label><input name="productType" value="${escapeHtml(p.productType || '')}" /></div>
        <div class="field"><label>Tags (comma-separated)</label><input name="tags" value="${escapeHtml(p.tags || '')}" /></div>
        <div class="modal-actions">
          <a href="#products" class="btn btn-secondary">Cancel</a>
          <button type="submit" class="btn btn-primary">${product?.id ? 'Save changes' : 'Create product'}</button>
        </div>
      </div>
    </form>`;
}

function bindProductImageHandlers(productId) {
  $('#product-image-upload-btn')?.addEventListener('click', async () => {
    const fileInput = $('#product-image-file');
    const file = fileInput?.files?.[0];
    if (!file) {
      showToast('Choose an image file', 'error');
      return;
    }
    if (file.size > 8 * 1024 * 1024) {
      showToast('Image must be under 8 MB', 'error');
      return;
    }
    const btn = $('#product-image-upload-btn');
    btn.disabled = true;
    btn.textContent = 'Uploading…';
    try {
      const dataBase64 = await readFileAsBase64(file);
      await api(`/console/api/v1/products/${productId}/images`, {
        method: 'POST',
        body: JSON.stringify({
          fileName: file.name,
          mimeType: file.type || 'image/jpeg',
          dataBase64,
          alt: $('#product-image-alt')?.value?.trim() || undefined,
        }),
      });
      showToast('Image uploaded');
      renderProductForm(productId);
    } catch (err) {
      showToast(err.message, 'error');
    } finally {
      btn.disabled = false;
      btn.textContent = 'Upload image';
    }
  });

  document.querySelectorAll('.product-image-remove').forEach((btn) => {
    btn.addEventListener('click', async () => {
      const imageId = btn.dataset.imageId;
      if (!imageId || !confirm('Remove this image?')) return;
      try {
        await api(`/console/api/v1/products/${productId}/images/${imageId}`, { method: 'DELETE' });
        showToast('Image removed');
        renderProductForm(productId);
      } catch (err) {
        showToast(err.message, 'error');
      }
    });
  });
}

async function renderProductForm(id) {
  if (!canEdit()) {
    $('#main-content').innerHTML = '<div class="alert alert-error">You do not have permission to edit products.</div>';
    return;
  }

  const el = $('#main-content');
  el.innerHTML = '<p class="loading">Loading…</p>';

  let product = null;
  if (id) {
    try {
      const data = await api(`/console/api/v1/products/${id}`);
      product = data.product;
    } catch (err) {
      el.innerHTML = `<div class="alert alert-error">${escapeHtml(err.message)}</div>`;
      return;
    }
  }

  el.innerHTML = productFormHtml(product);
  if (product?.id) bindProductImageHandlers(product.id);

  $('#product-form').addEventListener('submit', async (e) => {
    e.preventDefault();
    const fd = new FormData(e.target);
    const body = {
      title: fd.get('title'),
      bodyHtml: fd.get('bodyHtml') || '',
      price: fd.get('price') || undefined,
      sku: fd.get('sku') || undefined,
      status: fd.get('status'),
      vendor: fd.get('vendor') || 'Morbeez',
      productType: fd.get('productType') || '',
      tags: fd.get('tags') || '',
    };
    try {
      if (id) {
        await api(`/console/api/v1/products/${id}`, { method: 'PUT', body: JSON.stringify(body) });
        showToast('Product updated');
        renderProductForm(id);
      } else {
        const created = await api('/console/api/v1/products', { method: 'POST', body: JSON.stringify(body) });
        showToast('Product created — you can upload images now');
        location.hash = `products/edit/${created.product.id}`;
        navigate('products/edit', { id: created.product.id });
      }
    } catch (err) {
      showToast(err.message, 'error');
    }
  });
}

async function renderFarmers() {
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
        <td>${formatDate(f.lastLoginAt || f.createdAt)}</td>
        <td>${canEdit() ? `<button type="button" class="btn btn-secondary btn-sm" data-edit-farmer="${f.id}">Edit</button>` : '—'}</td>
      </tr>`;
      })
      .join('');

    el.innerHTML = `
      <div class="panel">
        <div class="panel-header">
          <h3>Website farmers</h3>
          <div class="toolbar">
            <input type="search" id="farmer-search" placeholder="Search email, name, phone…" value="${escapeHtml(state.farmers.search)}" />
            <button type="button" class="btn btn-secondary btn-sm" id="farmer-search-btn">Search</button>
          </div>
        </div>
        <div class="table-wrap">
          <table>
            <thead><tr><th>Name</th><th>Email</th><th>Phone</th><th>District</th><th>Last activity</th><th></th></tr></thead>
            <tbody>${rows || '<tr><td colspan="6" class="empty-state">No farmers found</td></tr>'}</tbody>
          </table>
        </div>
        ${renderPagination(pg)}
      </div>`;

    $('#farmer-search-btn')?.addEventListener('click', () => {
      state.farmers.search = $('#farmer-search').value.trim();
      state.farmers.page = 1;
      renderFarmers();
    });
    if (pg?.pages > 1) {
      bindPagination(el, pg, (p) => {
        state.farmers.page = p;
        renderFarmers();
      });
    }

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
        <div class="modal">
          <h3>Edit farmer</h3>
          <form id="farmer-form">
            <div class="form-row">
              <div class="field"><label>First name</label><input name="firstName" value="${escapeHtml(farmer.firstName || '')}" /></div>
              <div class="field"><label>Last name</label><input name="lastName" value="${escapeHtml(farmer.lastName || '')}" /></div>
            </div>
            <div class="field"><label>Phone</label><input name="phone" value="${escapeHtml(farmer.phone || '')}" /></div>
            <div class="form-row">
              <div class="field"><label>District</label><input name="district" value="${escapeHtml(farmer.district || '')}" /></div>
              <div class="field"><label>State</label><input name="state" value="${escapeHtml(farmer.state || '')}" /></div>
            </div>
            <div class="field">
              <label><input type="checkbox" name="newsletterSubscribed" ${farmer.newsletterSubscribed ? 'checked' : ''} /> Newsletter subscribed</label>
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

function onHashChange() {
  const hash = location.hash.slice(1) || 'dashboard';
  if (!localStorage.getItem(TOKEN_KEY) && hash !== 'login') {
    navigate('login');
    return;
  }
  if (hash.startsWith('products/edit/')) {
    navigate('products/edit', { id: hash.split('/')[2] });
  } else {
    navigate(hash);
  }
}

$('#login-form')?.addEventListener('submit', handleLogin);
$('#btn-logout')?.addEventListener('click', logout);
window.addEventListener('hashchange', onHashChange);

document.querySelectorAll('[data-nav]').forEach((a) => {
  a.addEventListener('click', () => {
    setTimeout(onHashChange, 0);
  });
});

if (localStorage.getItem(TOKEN_KEY)) {
  initSession();
} else {
  navigate('login');
}
