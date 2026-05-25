import {
  $,
  api,
  state,
  escapeHtml,
  formatDate,
  canEdit,
  renderPagination,
  bindPagination,
  readFileAsBase64,
  showToast,
  collectIntelFields,
  fieldHtml,
} from '../core.js';

export async function renderProducts() {
  const el = $('#main-content');
  el.innerHTML = '<p class="loading">Loading products…</p>';

  if (canEdit()) {
    $('#topbar-actions').innerHTML =
      '<a href="#products/new" class="btn btn-primary btn-sm">+ New product</a>';
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
        <td>${p.inventory != null ? `<span class="${p.inventory <= 10 ? 'text-warn' : ''}">${p.inventory}</span>` : '—'}</td>
        <td><span class="badge badge-${escapeHtml(p.status)}">${escapeHtml(p.status)}</span></td>
        <td>${escapeHtml(p.vendor || '—')}</td>
        <td>${formatDate(p.updatedAt)}</td>
        <td>${canEdit() ? `<a href="#products/edit/${p.id}" class="btn btn-secondary btn-sm">Edit</a>` : '—'}</td>
      </tr>`
      )
      .join('');

    el.innerHTML = `
      <div class="panel">
        <div class="panel-header">
          <h3>Product catalog <span class="muted" style="font-weight:400">(${pg.total})</span></h3>
          <div class="toolbar">
            <input type="search" id="product-search" placeholder="Search title, handle, vendor, tags…" value="${escapeHtml(state.products.search)}" />
            <select id="product-limit" class="toolbar-select">
              <option value="25" ${state.products.limit === 25 ? 'selected' : ''}>25 / page</option>
              <option value="50" ${state.products.limit === 50 ? 'selected' : ''}>50 / page</option>
              <option value="100" ${state.products.limit === 100 ? 'selected' : ''}>100 / page</option>
            </select>
            <button type="button" class="btn btn-secondary btn-sm" id="product-search-btn">Search</button>
          </div>
        </div>
        <div class="table-wrap">
          <table>
            <thead><tr><th></th><th>Product</th><th>Price</th><th>Stock</th><th>Status</th><th>Vendor</th><th>Updated</th><th></th></tr></thead>
            <tbody>${rows || '<tr><td colspan="8" class="empty-state">No products</td></tr>'}</tbody>
          </table>
        </div>
        ${renderPagination(pg)}
      </div>`;

    const apply = () => {
      state.products.search = $('#product-search').value.trim();
      state.products.limit = Number($('#product-limit').value) || 50;
      state.products.page = 1;
      renderProducts();
    };
    $('#product-search-btn')?.addEventListener('click', apply);
    $('#product-search')?.addEventListener('keydown', (ev) => ev.key === 'Enter' && apply());
    $('#product-limit')?.addEventListener('change', apply);
    bindPagination(el, pg, (p) => {
      state.products.page = p;
      renderProducts();
    });
  } catch (err) {
    el.innerHTML = `<div class="alert alert-error">${escapeHtml(err.message)}</div>`;
  }
}

export async function renderInventory() {
  state.products.search = '';
  const el = $('#main-content');
  el.innerHTML = '<p class="loading">Checking inventory…</p>';
  try {
    const data = await api('/console/api/v1/products?limit=100&page=1');
    const low = data.products
      .filter((p) => (p.inventory ?? 0) <= 10)
      .sort((a, b) => (a.inventory ?? 0) - (b.inventory ?? 0));

    const rows = low
      .map(
        (p) => `
      <tr>
        <td>${p.imageUrl ? `<img class="product-thumb" src="${escapeHtml(p.imageUrl)}" alt="" />` : ''}</td>
        <td><strong>${escapeHtml(p.title)}</strong></td>
        <td><span class="badge badge-warn">${p.inventory ?? 0} units</span></td>
        <td>₹${escapeHtml(p.price || '0')}</td>
        <td><a href="#products/edit/${p.id}" class="btn btn-secondary btn-sm">Restock / edit</a></td>
      </tr>`
      )
      .join('');

    el.innerHTML = `
      <div class="panel">
        <div class="panel-header"><h3>Low stock (≤10 units)</h3></div>
        <div class="table-wrap">
          <table>
            <thead><tr><th></th><th>Product</th><th>Stock</th><th>Price</th><th></th></tr></thead>
            <tbody>${rows || '<tr><td colspan="5" class="empty-state">All products adequately stocked</td></tr>'}</tbody>
          </table>
        </div>
      </div>`;
  } catch (err) {
    el.innerHTML = `<div class="alert alert-error">${escapeHtml(err.message)}</div>`;
  }
}

function productImagesHtml(product) {
  if (!product?.id) {
    return `<p class="muted text-sm">Save the product first to upload images.</p>`;
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
    <div class="product-image-gallery">${gallery || '<p class="muted">No images</p>'}</div>
    ${
      canEdit()
        ? `<div class="product-image-upload">
        <input type="file" id="product-image-file" accept="image/jpeg,image/png,image/webp,image/gif" />
        <input type="text" id="product-image-alt" placeholder="Alt text" class="input mt-2" />
        <button type="button" class="btn btn-secondary btn-sm mt-2" id="product-image-upload-btn">Upload image</button>
      </div>`
        : ''
    }`;
}

function intelTabAgriculture(intel) {
  const a = intel?.agriculture || {};
  return `<div class="form-grid">
    ${fieldHtml('Brand name', 'brandName', 'agriculture', { value: a.brandName })}
    ${fieldHtml('Trade name', 'tradeName', 'agriculture', { value: a.tradeName })}
    ${fieldHtml('Technical name', 'technicalName', 'agriculture', { value: a.technicalName })}
    ${fieldHtml('Category', 'category', 'agriculture', { value: a.category, placeholder: 'Insecticide' })}
    ${fieldHtml('Sub category', 'subCategory', 'agriculture', { value: a.subCategory })}
    ${fieldHtml('Formulation', 'productType', 'agriculture', { value: a.productType, placeholder: 'SC / EC / WG' })}
    ${fieldHtml('Technical content %', 'technicalContent', 'agriculture', { value: a.technicalContent })}
    ${fieldHtml('Active ingredient', 'activeIngredient', 'agriculture', { value: a.activeIngredient })}
    ${fieldHtml('Mode of action', 'modeOfAction', 'agriculture', { value: a.modeOfAction })}
    ${fieldHtml('FRAC / IRAC code', 'fracCode', 'agriculture', { value: a.fracCode })}
    ${fieldHtml('Target pests', 'targetPests', 'agriculture', { type: 'textarea', value: a.targetPests })}
    ${fieldHtml('Target diseases', 'targetDiseases', 'agriculture', { type: 'textarea', value: a.targetDiseases })}
    ${fieldHtml('Recommended crops', 'recommendedCrops', 'agriculture', { type: 'textarea', value: a.recommendedCrops })}
    ${fieldHtml('Crop stage', 'cropStage', 'agriculture', { value: a.cropStage })}
    ${fieldHtml('Dose per acre', 'dosePerAcre', 'agriculture', { value: a.dosePerAcre })}
    ${fieldHtml('Dose per pump (15–20L)', 'dosePerPump', 'agriculture', { value: a.dosePerPump })}
    ${fieldHtml('Waiting period (PHI)', 'waitingPeriod', 'agriculture', { value: a.waitingPeriod })}
    ${fieldHtml('Toxicity class', 'toxicityClass', 'agriculture', { value: a.toxicityClass })}
    ${fieldHtml('Compatibility', 'compatibility', 'agriculture', { type: 'textarea', value: a.compatibility })}
    ${fieldHtml('Incompatible products', 'incompatibleProducts', 'agriculture', { type: 'textarea', value: a.incompatibleProducts })}
  </div>`;
}

function intelTabAi(intel) {
  const a = intel?.aiMapping || {};
  return `<div class="form-grid">
    ${fieldHtml('Symptoms controlled', 'symptomsControlled', 'ai_mapping', { type: 'textarea', value: a.symptomsControlled })}
    ${fieldHtml('AI keywords', 'aiKeywords', 'ai_mapping', { type: 'textarea', value: a.aiKeywords, hint: 'Comma-separated: yellow leaves, stem borer' })}
    ${fieldHtml('Pest / disease tags', 'diseasePestTags', 'ai_mapping', { value: a.diseasePestTags })}
    ${fieldHtml('Crop problem stage', 'cropProblemStage', 'ai_mapping', { value: a.cropProblemStage, placeholder: 'Early / Mid / Severe' })}
    ${fieldHtml('Preventive / curative', 'preventiveCurative', 'ai_mapping', { value: a.preventiveCurative })}
    ${fieldHtml('Severity score', 'severityScore', 'ai_mapping', { value: a.severityScore, placeholder: 'Mild / Medium / Severe' })}
    ${fieldHtml('AI recommendation priority', 'aiPriority', 'ai_mapping', { type: 'number', value: a.aiPriority ?? '', placeholder: '1–100' })}
    ${fieldHtml('Weather suitability', 'weatherSuitability', 'ai_mapping', { value: a.weatherSuitability })}
    ${fieldHtml('Soil pH suitability', 'soilPh', 'ai_mapping', { value: a.soilPh })}
    ${fieldHtml('SPAD condition', 'spadCondition', 'ai_mapping', { value: a.spadCondition })}
    ${fieldHtml('Emergency product', 'emergencyProduct', 'ai_mapping', { type: 'select', value: a.emergencyProduct || 'no', options: [{ value: 'no', label: 'No' }, { value: 'yes', label: 'Yes' }] })}
  </div>`;
}

function intelTabSeo(intel) {
  const s = intel?.seo || {};
  return `<div class="form-grid">
    ${fieldHtml('SEO title', 'seoTitle', 'seo', { value: s.seoTitle })}
    ${fieldHtml('Meta description', 'seoDescription', 'seo', { type: 'textarea', value: s.seoDescription })}
    ${fieldHtml('SEO keywords', 'seoKeywords', 'seo', { value: s.seoKeywords })}
    ${fieldHtml('URL handle', 'urlHandle', 'seo', { value: s.urlHandle })}
    ${fieldHtml('YouTube link', 'youtubeLink', 'seo', { value: s.youtubeLink })}
    ${fieldHtml('Blog / guide link', 'blogLink', 'seo', { value: s.blogLink })}
    ${fieldHtml('Key benefits', 'keyBenefits', 'seo', { type: 'textarea', value: s.keyBenefits })}
    ${fieldHtml('Usage instructions', 'usageInstructions', 'seo', { type: 'textarea', value: s.usageInstructions })}
    ${fieldHtml('Safety instructions', 'safetyInstructions', 'seo', { type: 'textarea', value: s.safetyInstructions })}
  </div>`;
}

function intelTabCrossSell(intel) {
  const c = intel?.crossSell || {};
  return `<div class="form-grid">
    ${fieldHtml('Recommended with (tank mix)', 'recommendedWith', 'cross_sell', { type: 'textarea', value: c.recommendedWith })}
    ${fieldHtml('Alternative products', 'alternativeProducts', 'cross_sell', { type: 'textarea', value: c.alternativeProducts })}
    ${fieldHtml('Premium upgrade', 'premiumUpgrade', 'cross_sell', { value: c.premiumUpgrade })}
    ${fieldHtml('Combo products', 'comboProducts', 'cross_sell', { type: 'textarea', value: c.comboProducts })}
    ${fieldHtml('Follow-up spray products', 'followUpProducts', 'cross_sell', { type: 'textarea', value: c.followUpProducts })}
    ${fieldHtml('Rotation product', 'rotationProduct', 'cross_sell', { value: c.rotationProduct })}
    ${fieldHtml('Nutrient pairing', 'nutrientPairing', 'cross_sell', { value: c.nutrientPairing })}
    ${fieldHtml('Adjuvant recommendation', 'adjuvantRecommendation', 'cross_sell', { value: c.adjuvantRecommendation })}
  </div>`;
}

function intelTabBasic(intel) {
  const b = intel?.basic || {};
  return `<div class="form-grid">
    ${fieldHtml('Internal product ID', 'internalId', 'basic', { value: b.internalId })}
    ${fieldHtml('Barcode / GTIN', 'barcode', 'basic', { value: b.barcode })}
    ${fieldHtml('HSN code', 'hsnCode', 'basic', { value: b.hsnCode })}
    ${fieldHtml('GST %', 'gstPercent', 'basic', { value: b.gstPercent })}
    ${fieldHtml('Manufacturer', 'manufacturer', 'basic', { value: b.manufacturer })}
    ${fieldHtml('Country of origin', 'countryOrigin', 'basic', { value: b.countryOrigin || 'India' })}
    ${fieldHtml('Short description (card)', 'shortDescription', 'basic', { type: 'textarea', value: b.shortDescription })}
  </div>`;
}

function productFormHtml(product, intel) {
  const p = product || {};
  return `
    <form id="product-form" class="product-editor">
      <div class="tabs" role="tablist">
        <button type="button" class="tab active" data-tab="shopify">Shopify & pricing</button>
        <button type="button" class="tab" data-tab="basic">Basic info</button>
        <button type="button" class="tab" data-tab="agriculture">Agriculture</button>
        <button type="button" class="tab" data-tab="ai">AI mapping</button>
        <button type="button" class="tab" data-tab="seo">SEO & content</button>
        <button type="button" class="tab" data-tab="cross">Cross-sell</button>
        <button type="button" class="tab" data-tab="media">Media</button>
      </div>

      <div class="tab-panel active" data-panel="shopify">
        <div class="panel-section">
          <div class="field"><label>Title *</label><input name="title" class="input" required value="${escapeHtml(p.title || '')}" /></div>
          <div class="field"><label>Description (HTML)</label><textarea name="bodyHtml" class="input" rows="5">${escapeHtml(p.bodyHtml || '')}</textarea></div>
          <div class="form-row">
            <div class="field"><label>Price (₹)</label><input name="price" class="input" value="${escapeHtml(p.price || '')}" /></div>
            <div class="field"><label>SKU</label><input name="sku" class="input" value="${escapeHtml(p.sku || '')}" /></div>
          </div>
          <div class="form-row">
            <div class="field"><label>Status</label>
              <select name="status" class="input">
                <option value="draft" ${p.status === 'draft' ? 'selected' : ''}>Draft</option>
                <option value="active" ${p.status === 'active' ? 'selected' : ''}>Active</option>
                <option value="archived" ${p.status === 'archived' ? 'selected' : ''}>Archived</option>
              </select>
            </div>
            <div class="field"><label>Vendor</label><input name="vendor" class="input" value="${escapeHtml(p.vendor || 'Morbeez')}" /></div>
          </div>
          <div class="field"><label>Product type</label><input name="productType" class="input" value="${escapeHtml(p.productType || '')}" /></div>
          <div class="field"><label>Tags (comma-separated)</label><input name="tags" class="input" value="${escapeHtml(p.tags || '')}" /></div>
        </div>
      </div>

      <div class="tab-panel" data-panel="basic">${intelTabBasic(intel)}</div>
      <div class="tab-panel" data-panel="agriculture">${intelTabAgriculture(intel)}</div>
      <div class="tab-panel" data-panel="ai">${intelTabAi(intel)}</div>
      <div class="tab-panel" data-panel="seo">${intelTabSeo(intel)}</div>
      <div class="tab-panel" data-panel="cross">${intelTabCrossSell(intel)}</div>
      <div class="tab-panel" data-panel="media"><div class="panel-section">${productImagesHtml(p)}</div></div>

      <div class="form-footer">
        <a href="#products" class="btn btn-secondary">Cancel</a>
        <button type="submit" class="btn btn-primary">${p.id ? 'Save product' : 'Create product'}</button>
      </div>
    </form>`;
}

function bindTabs(root) {
  root.querySelectorAll('.tab').forEach((tab) => {
    tab.addEventListener('click', () => {
      const id = tab.dataset.tab;
      root.querySelectorAll('.tab').forEach((t) => t.classList.toggle('active', t.dataset.tab === id));
      root.querySelectorAll('.tab-panel').forEach((p) => p.classList.toggle('active', p.dataset.panel === id));
    });
  });
}

function bindProductImageHandlers(productId) {
  $('#product-image-upload-btn')?.addEventListener('click', async () => {
    const file = $('#product-image-file')?.files?.[0];
    if (!file) return showToast('Choose an image', 'error');
    const btn = $('#product-image-upload-btn');
    btn.disabled = true;
    try {
      await api(`/console/api/v1/products/${productId}/images`, {
        method: 'POST',
        body: JSON.stringify({
          fileName: file.name,
          mimeType: file.type || 'image/jpeg',
          dataBase64: await readFileAsBase64(file),
          alt: $('#product-image-alt')?.value?.trim() || undefined,
        }),
      });
      showToast('Image uploaded');
      renderProductForm(productId);
    } catch (err) {
      showToast(err.message, 'error');
    } finally {
      btn.disabled = false;
    }
  });
  document.querySelectorAll('.product-image-remove').forEach((btn) => {
    btn.addEventListener('click', async () => {
      if (!confirm('Remove image?')) return;
      try {
        await api(`/console/api/v1/products/${productId}/images/${btn.dataset.imageId}`, { method: 'DELETE' });
        showToast('Removed');
        renderProductForm(productId);
      } catch (err) {
        showToast(err.message, 'error');
      }
    });
  });
}

export async function renderProductForm(id) {
  if (!canEdit()) {
    $('#main-content').innerHTML = '<div class="alert alert-error">You do not have permission to edit products.</div>';
    return;
  }

  const el = $('#main-content');
  el.innerHTML = '<p class="loading">Loading product…</p>';

  let product = null;
  let intel = null;
  if (id) {
    try {
      const [pRes, iRes] = await Promise.all([
        api(`/console/api/v1/products/${id}`),
        api(`/console/api/v1/products/${id}/intelligence`).catch(() => ({ intelligence: null })),
      ]);
      product = pRes.product;
      intel = iRes.intelligence;
    } catch (err) {
      el.innerHTML = `<div class="alert alert-error">${escapeHtml(err.message)}</div>`;
      return;
    }
  }

  el.innerHTML = `<div class="panel product-form-panel">${productFormHtml(product, intel)}</div>`;
  bindTabs(el);
  if (product?.id) bindProductImageHandlers(product.id);

  $('#product-form').addEventListener('submit', async (e) => {
    e.preventDefault();
    const form = e.target;
    const fd = new FormData(form);
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
    const intelBody = {
      basic: collectIntelFields(form, 'basic'),
      agriculture: collectIntelFields(form, 'agriculture'),
      aiMapping: collectIntelFields(form, 'ai_mapping'),
      seo: collectIntelFields(form, 'seo'),
      crossSell: collectIntelFields(form, 'cross_sell'),
    };

    try {
      if (id) {
        await api(`/console/api/v1/products/${id}`, { method: 'PUT', body: JSON.stringify(body) });
        await api(`/console/api/v1/products/${id}/intelligence`, {
          method: 'PUT',
          body: JSON.stringify(intelBody),
        });
        showToast('Product & intelligence saved');
        renderProductForm(id);
      } else {
        const created = await api('/console/api/v1/products', { method: 'POST', body: JSON.stringify(body) });
        const newId = created.product.id;
        await api(`/console/api/v1/products/${newId}/intelligence`, {
          method: 'PUT',
          body: JSON.stringify(intelBody),
        });
        showToast('Product created');
        location.hash = `products/edit/${newId}`;
      }
    } catch (err) {
      showToast(err.message, 'error');
    }
  });
}
