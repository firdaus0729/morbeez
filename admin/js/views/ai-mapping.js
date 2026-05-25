import { $, api, state, escapeHtml, canEdit, showToast } from '../core.js';
import { icon } from '../icons.js';

const TABS = [
  {
    id: 'crop',
    label: 'Crop Mapping',
    title: 'Crop Mapping',
    subtitle: 'Map products with multiple crops',
    mappedCol: 'Mapped Crops',
    countCol: 'No. of Crops',
    cta: 'Map Product to Crop',
    searchPh: 'Search product or crop…',
  },
  {
    id: 'pest',
    label: 'Pest Mapping',
    title: 'Pest Mapping',
    subtitle: 'Map products with multiple pests',
    mappedCol: 'Mapped Pests',
    countCol: 'No. of Pests',
    cta: 'Map Product to Pest',
    searchPh: 'Search product or pest…',
  },
  {
    id: 'disease',
    label: 'Disease Mapping',
    title: 'Disease Mapping',
    subtitle: 'Map products with multiple diseases',
    mappedCol: 'Mapped Diseases',
    countCol: 'No. of Diseases',
    cta: 'Map Product to Disease',
    searchPh: 'Search product or disease…',
  },
  {
    id: 'symptom',
    label: 'Symptom Mapping',
    title: 'Symptom Mapping',
    subtitle: 'Map symptoms to product recommendations',
    mappedCol: 'Mapped Symptoms',
    countCol: 'No. of Symptoms',
    cta: 'Map Product to Symptom',
    searchPh: 'Search product or symptom…',
  },
  {
    id: 'usage',
    label: 'Usage Rules',
    title: 'Usage Rules',
    subtitle: 'Dosage and application rules per product',
    mappedCol: 'Usage Rules',
    countCol: 'No. of Rules',
    cta: 'Edit Usage Rules',
    searchPh: 'Search product or rule…',
  },
];

const SUGGESTED_CROPS = [
  'Paddy',
  'Cotton',
  'Chili',
  'Tomato',
  'Maize',
  'Soybean',
  'Ginger',
  'Grapes',
  'Potato',
  'All Crops',
];

const SUGGESTED_PESTS = [
  'Stem Borer',
  'Leaf Folder',
  'Shoot Borer',
  'Gundhi Bug',
  'Rice Hispa',
  'Brown Plant Hopper',
  'Whitefly',
  'Thrips',
  'Aphids',
  'Spodoptera',
  'Helicoverpa',
  'Fruit Borer',
  'Leaf Miner',
  'Cutworm',
  'Jassids',
];

const SUGGESTED_DISEASES = [
  'Leaf Spot',
  'Blight',
  'Anthracnose',
  'Downy Mildew',
  'Powdery Mildew',
  'Early Blight',
  'Late Blight',
  'Bacterial Leaf Blight',
  'Rust',
  'Root Rot',
  'Damping Off',
  'Wilt',
  'Sheath Blight',
  'Collar Rot',
];

const SUGGESTED_SYMPTOMS = [
  'Yellowing Leaves',
  'Leaf Curl',
  'Leaf Spots',
  'Wilting',
  'Stem Borer Damage',
  'Stunted Growth',
];

const LIST_TAB_CONFIG = {
  crop: {
    apiSegment: 'crops',
    bodyField: 'crops',
    suggestions: SUGGESTED_CROPS,
    fieldLabel: 'Mapped crops',
    placeholder: 'Type crop and press Enter',
    singular: 'crop',
    allExclusive: 'All Crops',
  },
  pest: {
    apiSegment: 'pests',
    bodyField: 'pests',
    suggestions: SUGGESTED_PESTS,
    fieldLabel: 'Mapped pests',
    placeholder: 'Type pest and press Enter',
    singular: 'pest',
  },
  disease: {
    apiSegment: 'diseases',
    bodyField: 'diseases',
    suggestions: SUGGESTED_DISEASES,
    fieldLabel: 'Mapped diseases',
    placeholder: 'Type disease and press Enter',
    singular: 'disease',
  },
  symptom: {
    apiSegment: 'symptoms',
    bodyField: 'symptoms',
    suggestions: SUGGESTED_SYMPTOMS,
    fieldLabel: 'Mapped symptoms',
    placeholder: 'Type symptom and press Enter',
    singular: 'symptom',
  },
};

const EDITABLE_TABS = new Set(['crop', 'pest', 'disease', 'symptom']);

const MAX_VISIBLE_TAGS = 3;

function tabConfig() {
  return TABS.find((t) => t.id === state.aiMapping.tab) || TABS[0];
}

function renderMappedTags(row) {
  if (row.mappedDisplay === 'all') {
    return `<span class="ai-map-all">${escapeHtml(row.allCropsLabel || 'All Crops')}</span>`;
  }
  if (row.mappedDisplay === 'empty') {
    return '<span class="muted">—</span>';
  }
  const tags = row.mappedTags || [];
  const visible = tags.slice(0, MAX_VISIBLE_TAGS);
  const extra = tags.length - visible.length;
  const chips = visible
    .map((t) => `<span class="map-chip">${escapeHtml(t)}</span>`)
    .join('');
  const more = extra > 0 ? `<span class="map-chip map-chip-more">+${extra}</span>` : '';
  return `<div class="map-chips">${chips}${more}</div>`;
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
      <p class="products-showing">Showing <strong>${from}</strong> to <strong>${to}</strong> of <strong>${pg.total}</strong> products</p>
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

function openListMappingModal(tabId, row, onSaved) {
  const root = $('#modal-root');
  const cfg = LIST_TAB_CONFIG[tabId];
  const tabMeta = TABS.find((t) => t.id === tabId);
  if (!root || !cfg || !tabMeta) return;
  root.classList.remove('hidden');

  let selected = [...(row?.mappedTags || row?.mapped || [])];
  if (tabId === 'crop' && row?.mappedDisplay === 'all') selected = ['All Crops'];

  const isEdit = Boolean(row?.productId);
  const productField = isEdit
    ? `<p class="ai-map-product-name"><strong>${escapeHtml(row.productName)}</strong></p>`
    : `<div class="field field-full">
        <label>Product</label>
        <select id="map-product-select" class="input" required>
          <option value="">Select product…</option>
        </select>
      </div>`;

  function paint() {
    const editor = $('#map-chip-editor');
    if (!editor) return;
    editor.innerHTML =
      selected.length > 0
        ? selected
            .map(
              (item) =>
                `<span class="map-chip map-chip-editable">${escapeHtml(item)} <button type="button" data-remove-item="${escapeHtml(item)}" aria-label="Remove">×</button></span>`
            )
            .join('')
        : `<span class="muted">No ${escapeHtml(cfg.singular)}s added</span>`;
  }

  const suggestions = cfg.suggestions
    .map(
      (s) =>
        `<button type="button" class="map-suggest-btn" data-add-item="${escapeHtml(s)}">${escapeHtml(s)}</button>`
    )
    .join('');

  root.innerHTML = `
    <div class="modal-backdrop" id="map-modal-bg">
      <div class="modal-card modal-card-wide" role="dialog">
        <div class="modal-header">
          <h2>${isEdit ? `Edit ${cfg.singular} mapping` : tabMeta.cta.replace(/^\+ /, '')}</h2>
          <button type="button" class="modal-close" id="map-modal-close" aria-label="Close">×</button>
        </div>
        <form id="map-modal-form" class="modal-body">
          <div id="map-modal-alert" class="alert alert-error hidden"></div>
          ${productField}
          <div class="field field-full">
            <label>${escapeHtml(cfg.fieldLabel)}</label>
            <div class="map-chip-editor" id="map-chip-editor"></div>
            <div class="map-chip-input-row">
              <input type="text" id="map-chip-input" class="input" placeholder="${escapeHtml(cfg.placeholder)}" />
              <button type="button" class="btn btn-secondary btn-sm" id="map-chip-add">Add</button>
            </div>
            <div class="map-suggestions">${suggestions}</div>
          </div>
          <div class="modal-footer">
            <button type="button" class="btn btn-secondary" id="map-modal-cancel">Cancel</button>
            <button type="submit" class="btn btn-primary">Save mapping</button>
          </div>
        </form>
      </div>
    </div>`;

  paint();

  const addItem = (name) => {
    const val = name.trim();
    if (!val) return;
    if (cfg.allExclusive && val.toLowerCase() === cfg.allExclusive.toLowerCase()) {
      selected = [cfg.allExclusive];
    } else {
      if (cfg.allExclusive) {
        selected = selected.filter((c) => c.toLowerCase() !== cfg.allExclusive.toLowerCase());
      }
      if (!selected.includes(val)) selected.push(val);
    }
    paint();
  };

  $('#map-chip-add')?.addEventListener('click', () => {
    addItem($('#map-chip-input')?.value || '');
    const inp = $('#map-chip-input');
    if (inp) inp.value = '';
  });
  $('#map-chip-input')?.addEventListener('keydown', (ev) => {
    if (ev.key === 'Enter') {
      ev.preventDefault();
      addItem(ev.target.value);
      ev.target.value = '';
    }
  });

  root.querySelectorAll('[data-add-item]').forEach((btn) => {
    btn.addEventListener('click', () => addItem(btn.dataset.addItem));
  });

  root.addEventListener('click', (ev) => {
    const rm = ev.target.closest('[data-remove-item]');
    if (rm) {
      selected = selected.filter((c) => c !== rm.dataset.removeItem);
      paint();
    }
  });

  if (!isEdit) {
    api('/console/api/v1/ai-mapping/product-options')
      .then((data) => {
        const sel = $('#map-product-select');
        if (!sel) return;
        sel.innerHTML =
          '<option value="">Select product…</option>' +
          (data.products || [])
            .map(
              (p) => `<option value="${escapeHtml(p.id)}">${escapeHtml(p.title)}</option>`
            )
            .join('');
      })
      .catch(() => {});
  }

  const close = () => closeModal();
  $('#map-modal-close')?.addEventListener('click', close);
  $('#map-modal-cancel')?.addEventListener('click', close);
  $('#map-modal-bg')?.addEventListener('click', (ev) => {
    if (ev.target.id === 'map-modal-bg') close();
  });

  $('#map-modal-form')?.addEventListener('submit', async (ev) => {
    ev.preventDefault();
    const alert = $('#map-modal-alert');
    alert?.classList.add('hidden');
    const productId = isEdit ? row.productId : $('#map-product-select')?.value;
    if (!productId) {
      if (alert) {
        alert.textContent = 'Select a product';
        alert.classList.remove('hidden');
      }
      return;
    }
    try {
      await api(`/console/api/v1/ai-mapping/products/${productId}/${cfg.apiSegment}`, {
        method: 'PATCH',
        body: JSON.stringify({ [cfg.bodyField]: selected }),
      });
      showToast(`${tabMeta.title} saved`);
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

export async function renderAiMapping() {
  const el = $('#main-content');
  el.innerHTML = '<div class="products-loading"><div class="spinner"></div></div>';

  const cfg = tabConfig();

  try {
    const q = new URLSearchParams({
      tab: state.aiMapping.tab,
      page: String(state.aiMapping.page),
      limit: String(state.aiMapping.limit),
      ...(state.aiMapping.search ? { search: state.aiMapping.search } : {}),
      ...(state.aiMapping.filter === 'mapped' ? { filter: 'mapped' } : {}),
      ...(state.aiMapping.filter === 'unmapped' ? { filter: 'unmapped' } : {}),
    });
    const data = await api(`/console/api/v1/ai-mapping?${q}`);
    const pg = data.pagination;
    const rows = data.rows || [];

    const tabHtml = TABS.map(
      (t) =>
        `<button type="button" class="orders-tab ${state.aiMapping.tab === t.id ? 'active' : ''}" data-map-tab="${t.id}">${escapeHtml(t.label)}</button>`
    ).join('');

    const rowsById = new Map(rows.map((r) => [r.productId, r]));

    const editable = EDITABLE_TABS.has(state.aiMapping.tab) && canEdit();

    const tableRows = rows
      .map((r) => {
        const editBtn = editable
          ? `<button type="button" class="action-icon" title="Edit mapping" data-edit-mapping="${escapeHtml(state.aiMapping.tab)}" data-product-id="${escapeHtml(r.productId)}">${icon('edit', 'icon-action')}</button>`
          : `<a href="#products/edit/${escapeHtml(r.productId)}" class="action-icon" title="Edit in product wizard">${icon('edit', 'icon-action')}</a>`;
        return `
      <tr>
        <td class="col-product-name"><strong>${escapeHtml(r.productName)}</strong></td>
        <td class="col-mapped">${renderMappedTags(r)}</td>
        <td class="col-center">${r.mappedCount}</td>
        <td class="col-actions">${editBtn}</td>
      </tr>`;
      })
      .join('');

    const filtersOpen = state.aiMapping.filtersOpen;

    el.innerHTML = `
      <div class="ai-mapping-page products-page">
        <nav class="orders-tabs ai-map-tabs" aria-label="AI mapping">${tabHtml}</nav>

        <div class="ai-map-section-head">
          <div>
            <h2 class="ai-map-section-title">${escapeHtml(cfg.title)}</h2>
            <p class="ai-map-section-sub">${escapeHtml(cfg.subtitle)}</p>
          </div>
        </div>

        <div class="products-toolbar">
          <div class="products-search-wrap ai-map-search">
            ${icon('search', 'icon-search-inline')}
            <input type="search" id="ai-map-search" class="products-search" placeholder="${escapeHtml(cfg.searchPh)}" value="${escapeHtml(state.aiMapping.search)}" />
          </div>
          <button type="button" class="btn-filters ${filtersOpen ? 'active' : ''}" id="ai-map-toggle-filters" aria-expanded="${filtersOpen}">
            ${icon('filter', 'icon-filter')}
            Filters
          </button>
        </div>

        <div class="inventory-filters-panel ${filtersOpen}" id="ai-map-filters" ${filtersOpen ? '' : 'hidden'}>
          <label class="inventory-filter-label" for="ai-map-filter">Mapping</label>
          <select id="ai-map-filter" class="products-select">
            <option value="" ${!state.aiMapping.filter ? 'selected' : ''}>All products</option>
            <option value="mapped" ${state.aiMapping.filter === 'mapped' ? 'selected' : ''}>Mapped only</option>
            <option value="unmapped" ${state.aiMapping.filter === 'unmapped' ? 'selected' : ''}>Not mapped</option>
          </select>
          <button type="button" class="btn btn-primary btn-sm" id="ai-map-apply-filters">Apply</button>
        </div>

        <div class="products-table-card">
          <div class="table-wrap">
            <table class="products-table ai-map-table">
              <thead>
                <tr>
                  <th>Product</th>
                  <th>${escapeHtml(cfg.mappedCol)}</th>
                  <th class="col-center">${escapeHtml(cfg.countCol)}</th>
                  <th class="col-actions-h">Action</th>
                </tr>
              </thead>
              <tbody>${tableRows || '<tr><td colspan="4" class="empty-state">No products found</td></tr>'}</tbody>
            </table>
          </div>
          ${renderPagination(pg)}
        </div>
        ${
          rows.some((r) => r.isPreview) && state.aiMapping.tab === 'pest'
            ? '<p class="ai-map-hint muted">Sample pest mappings shown for preview — save a product to store real mappings.</p>'
            : ''
        }
        ${
          rows.some((r) => r.isPreview) && state.aiMapping.tab === 'disease'
            ? '<p class="ai-map-hint muted">Sample disease mappings shown for preview — save a product to store real mappings.</p>'
            : ''
        }
        ${
          state.aiMapping.tab === 'usage'
            ? '<p class="ai-map-hint muted">Usage rules are edited in <a href="#products">Products</a> → Edit → AI mapping (step 3).</p>'
            : ''
        }
      </div>`;

    el.querySelectorAll('[data-map-tab]').forEach((btn) => {
      btn.addEventListener('click', () => {
        state.aiMapping.tab = btn.dataset.mapTab;
        state.aiMapping.page = 1;
        renderAiMapping();
      });
    });

    const applyFilters = () => {
      state.aiMapping.search = $('#ai-map-search')?.value.trim() || '';
      state.aiMapping.filter = $('#ai-map-filter')?.value || '';
      state.aiMapping.page = 1;
      renderAiMapping();
    };

    $('#ai-map-toggle-filters')?.addEventListener('click', () => {
      state.aiMapping.filtersOpen = !state.aiMapping.filtersOpen;
      const panel = $('#ai-map-filters');
      const btn = $('#ai-map-toggle-filters');
      if (panel) {
        panel.hidden = !state.aiMapping.filtersOpen;
        panel.classList.toggle('open', state.aiMapping.filtersOpen);
      }
      btn?.classList.toggle('active', state.aiMapping.filtersOpen);
      btn?.setAttribute('aria-expanded', String(state.aiMapping.filtersOpen));
    });

    $('#ai-map-apply-filters')?.addEventListener('click', applyFilters);
    $('#ai-map-search')?.addEventListener('keydown', (ev) => {
      if (ev.key === 'Enter') applyFilters();
    });

    el.querySelectorAll('[data-edit-mapping]').forEach((btn) => {
      btn.addEventListener('click', () => {
        const row = rowsById.get(btn.dataset.productId);
        const tabId = btn.dataset.editMapping;
        if (row && LIST_TAB_CONFIG[tabId]) {
          openListMappingModal(tabId, row, () => renderAiMapping());
        }
      });
    });

    const footer = el.querySelector('.products-table-footer');
    if (footer) {
      bindPagination(footer, pg, (p) => {
        state.aiMapping.page = p;
        renderAiMapping();
        window.scrollTo({ top: 0, behavior: 'smooth' });
      });
    }

    bindAiMappingTopbar();
  } catch (err) {
    el.innerHTML = `<div class="alert alert-error">${escapeHtml(err.message)}</div>`;
  }
}

export function bindAiMappingTopbar() {
  const cfg = tabConfig();
  if (!canEdit() || !EDITABLE_TABS.has(state.aiMapping.tab)) {
    $('#topbar-actions').innerHTML = '';
    return;
  }
  $('#topbar-actions').innerHTML =
    '<button type="button" class="btn btn-primary btn-sm btn-add-product" id="btn-map-list">' +
    icon('plus', 'icon-btn') +
    ` ${escapeHtml(cfg.cta)}</button>`;
  $('#btn-map-list')?.addEventListener('click', () => {
    openListMappingModal(state.aiMapping.tab, null, () => renderAiMapping());
  });
}
