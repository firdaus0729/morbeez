import { $, api, escapeHtml, canEdit, readFileAsBase64, showToast } from '../core.js';
import { icon } from '../icons.js';

const STEPS = [
  { n: 1, title: 'Basic Information', sub: 'Product details' },
  { n: 2, title: 'Variants & Pricing', sub: 'Pack sizes & pricing' },
  { n: 3, title: 'AI Mapping', sub: 'Crop, pest & disease' },
  { n: 4, title: 'Media & Documents', sub: 'Images, videos, docs' },
  { n: 5, title: 'SEO & Publish', sub: 'SEO & publish settings' },
];

const CATEGORIES = [
  'Insecticide',
  'Fungicide',
  'Fertilizer',
  'PGR',
  'Micronutrient',
  'Bio Stimulant',
  'Herbicide',
  'Other',
];

const SUB_CATEGORIES = [
  'Diamide Insecticide',
  'Neonicotinoid',
  'Triazole Fungicide',
  'NPK Fertilizer',
  'Growth Regulator',
  'Other',
];

const UNITS = ['ml', 'L', 'kg', 'g'];

const CROP_SUGGESTIONS = ['Paddy', 'Ginger', 'Banana', 'Chili', 'Cotton', 'Tomato', 'Maize', 'Sugarcane'];

const draft = {
  step: 1,
  productId: null,
  aiTab: 'crop',
};

function emptyVariant() {
  return { packSize: '', unit: 'ml', mrp: '', sellingPrice: '', dealerPrice: '', stock: 0, sku: '' };
}

function defaultDraft() {
  return {
    basic: {
      tradeName: '',
      technicalName: '',
      category: '',
      subCategory: '',
      formulationType: '',
      modeOfAction: '',
      modeOfEntry: '',
      shortDescription: '',
      longDescription: '',
      featured: true,
      bestSeller: false,
      trending: false,
      active: true,
      skuPrefix: '',
      hsnCode: '',
      gstPercent: '18',
      shelfLife: '',
      storageConditions: '',
      variants: [emptyVariant()],
    },
    agriculture: {},
    aiMapping: {
      crops: [],
      pests: [],
      diseases: [],
      dosage: '',
      waterVolume: '',
      applicationStage: '',
      sprayInterval: '',
      waitingPeriodDays: '',
      numberOfSprays: '',
      compatibleProducts: '',
      incompatibleProducts: '',
    },
    seo: {
      seoTitle: '',
      seoDescription: '',
      seoKeywords: '',
      urlHandle: '',
      youtubeLink: '',
      labelPdfUrl: '',
      technicalPdfUrl: '',
      safetyPdfUrl: '',
      videoUrl: '',
    },
    crossSell: {},
    product: { status: 'draft', vendor: 'Morbeez' },
    images: [],
  };
}

let formData = defaultDraft();

function mergeIntel(intel) {
  if (!intel) return;
  const ag = intel.agriculture || {};
  formData.basic = {
    ...formData.basic,
    ...intel.basic,
    tradeName: intel.basic?.tradeName || ag.tradeName || formData.basic.tradeName,
    technicalName: intel.basic?.technicalName || ag.technicalName || formData.basic.technicalName,
    category: intel.basic?.category || ag.category || formData.basic.category,
    subCategory: intel.basic?.subCategory || ag.subCategory || formData.basic.subCategory,
    formulationType: intel.basic?.formulationType || ag.productType || formData.basic.formulationType,
    modeOfAction: intel.basic?.modeOfAction || ag.modeOfAction || formData.basic.modeOfAction,
    modeOfEntry: intel.basic?.modeOfEntry || ag.modeOfEntry || formData.basic.modeOfEntry,
    shortDescription: intel.basic?.shortDescription || formData.basic.shortDescription,
    hsnCode: intel.basic?.hsnCode || formData.basic.hsnCode,
    gstPercent: intel.basic?.gstPercent || formData.basic.gstPercent,
    shelfLife: intel.basic?.shelfLife || formData.basic.shelfLife,
    storageConditions: intel.basic?.storageConditions || formData.basic.storageConditions,
    skuPrefix: intel.basic?.skuPrefix || formData.basic.skuPrefix,
  };
  formData.agriculture = { ...formData.agriculture, ...ag };
  const ai = intel.aiMapping || intel.ai_mapping || {};
  formData.aiMapping = { ...formData.aiMapping, ...ai };
  if (typeof ai.crops === 'string') {
    formData.aiMapping.crops = ai.crops.split(',').map((s) => s.trim()).filter(Boolean);
  } else if (Array.isArray(ai.crops)) {
    formData.aiMapping.crops = ai.crops;
  }
  if (ag.recommendedCrops && !formData.aiMapping.crops?.length) {
    formData.aiMapping.crops = String(ag.recommendedCrops)
      .split(',')
      .map((s) => s.trim())
      .filter(Boolean);
  }
  formData.aiMapping.dosage = formData.aiMapping.dosage || ag.dosePerAcre || '';
  formData.aiMapping.waitingPeriodDays = formData.aiMapping.waitingPeriodDays || ag.waitingPeriod || '';
  formData.aiMapping.compatibleProducts = formData.aiMapping.compatibleProducts || ag.compatibility || '';
  formData.aiMapping.incompatibleProducts = formData.aiMapping.incompatibleProducts || ag.incompatibleProducts || '';
  formData.seo = { ...formData.seo, ...intel.seo };
  formData.crossSell = { ...formData.crossSell, ...intel.crossSell };
  if (intel.basic?.variants?.length) formData.basic.variants = intel.basic.variants;
}

function loadFromProduct(product) {
  if (!product) return;
  formData.product.status = product.status || 'draft';
  const ag = formData.agriculture;
  formData.basic.tradeName = formData.basic.tradeName || ag.tradeName || product.title;
  formData.basic.technicalName = formData.basic.technicalName || ag.technicalName || '';
  formData.basic.category = formData.basic.category || product.category || product.productType || '';
  formData.basic.longDescription = formData.basic.longDescription || product.bodyHtml || '';
  formData.basic.active = product.status === 'active';

  if (product.variants?.length) {
    formData.basic.variants = product.variants.map((v) => ({
      id: v.id,
      packSize: v.packSize || '',
      unit: v.unit || 'ml',
      mrp: v.mrp || v.price || '',
      sellingPrice: v.price || '',
      dealerPrice: v.dealerPrice || '',
      stock: v.inventory ?? 0,
      sku: v.sku || '',
    }));
  }
  if (product.images?.length) formData.images = product.images;
}

function wizardField(label, id, value, opts = {}) {
  const req = opts.required ? ' <span class="req">*</span>' : '';
  const type = opts.type || 'text';
  const ph = opts.placeholder ? ` placeholder="${escapeHtml(opts.placeholder)}"` : '';
  if (type === 'textarea') {
    const max = opts.max || 0;
    const len = (value || '').length;
    return `<div class="wz-field ${opts.full ? 'wz-field-full' : ''}">
      <label for="${id}">${label}${req}</label>
      <textarea id="${id}" class="wz-input" rows="${opts.rows || 3}"${ph} data-wz="${id}">${escapeHtml(value || '')}</textarea>
      ${max ? `<span class="wz-counter" data-counter-for="${id}">${len} / ${max}</span>` : ''}
    </div>`;
  }
  if (type === 'select') {
    const optsHtml = (opts.options || [])
      .map((o) => `<option value="${escapeHtml(o.value)}" ${String(value) === String(o.value) ? 'selected' : ''}>${escapeHtml(o.label)}</option>`)
      .join('');
    return `<div class="wz-field"><label for="${id}">${label}${req}</label>
      <select id="${id}" class="wz-input wz-select" data-wz="${id}">${optsHtml}</select></div>`;
  }
  return `<div class="wz-field ${opts.full ? 'wz-field-full' : ''}">
    <label for="${id}">${label}${req}</label>
    <input id="${id}" type="${type}" class="wz-input" value="${escapeHtml(value || '')}"${ph} data-wz="${id}" />
  </div>`;
}

function readFormIntoData() {
  document.querySelectorAll('[data-wz]').forEach((el) => {
    const key = el.dataset.wz;
    const val = el.type === 'checkbox' ? el.checked : el.value;
    setNestedValue(key, val);
  });
}

function setNestedValue(key, val) {
  const map = {
    tradeName: ['basic', 'tradeName'],
    technicalName: ['basic', 'technicalName'],
    category: ['basic', 'category'],
    subCategory: ['basic', 'subCategory'],
    formulationType: ['basic', 'formulationType'],
    modeOfAction: ['basic', 'modeOfAction'],
    modeOfEntry: ['basic', 'modeOfEntry'],
    shortDescription: ['basic', 'shortDescription'],
    longDescription: ['basic', 'longDescription'],
    skuPrefix: ['basic', 'skuPrefix'],
    hsnCode: ['basic', 'hsnCode'],
    gstPercent: ['basic', 'gstPercent'],
    shelfLife: ['basic', 'shelfLife'],
    storageConditions: ['basic', 'storageConditions'],
    dosage: ['aiMapping', 'dosage'],
    waterVolume: ['aiMapping', 'waterVolume'],
    applicationStage: ['aiMapping', 'applicationStage'],
    sprayInterval: ['aiMapping', 'sprayInterval'],
    waitingPeriodDays: ['aiMapping', 'waitingPeriodDays'],
    numberOfSprays: ['aiMapping', 'numberOfSprays'],
    compatibleProducts: ['aiMapping', 'compatibleProducts'],
    incompatibleProducts: ['aiMapping', 'incompatibleProducts'],
    targetPests: ['aiMapping', 'targetPests'],
    targetDiseases: ['aiMapping', 'targetDiseases'],
    diseasePestTags: ['aiMapping', 'diseasePestTags'],
    symptomsControlled: ['aiMapping', 'symptomsControlled'],
    preventiveCurative: ['aiMapping', 'preventiveCurative'],
    weatherSuitability: ['aiMapping', 'weatherSuitability'],
    aiPriority: ['aiMapping', 'aiPriority'],
    seoTitle: ['seo', 'seoTitle'],
    seoDescription: ['seo', 'seoDescription'],
    seoKeywords: ['seo', 'seoKeywords'],
    urlHandle: ['seo', 'urlHandle'],
    youtubeLink: ['seo', 'youtubeLink'],
    videoUrl: ['seo', 'videoUrl'],
    labelPdfUrl: ['seo', 'labelPdfUrl'],
    technicalPdfUrl: ['seo', 'technicalPdfUrl'],
    safetyPdfUrl: ['seo', 'safetyPdfUrl'],
  };
  const path = map[key];
  if (!path) return;
  let obj = formData;
  for (let i = 0; i < path.length - 1; i++) obj = obj[path[i]];
  obj[path[path.length - 1]] = val;
}

function renderStepper() {
  return STEPS.map((s) => {
    const done = s.n < draft.step;
    const active = s.n === draft.step;
    const cls = done ? 'done' : active ? 'active' : '';
    const iconInner = done
      ? '<span class="wz-step-check">✓</span>'
      : `<span class="wz-step-num">${s.n}</span>`;
    return `<li class="wz-step ${cls}" data-goto-step="${s.n}">
      ${iconInner}
      <div class="wz-step-text">
        <strong>${escapeHtml(s.title)}</strong>
        <small>${escapeHtml(s.sub)}</small>
      </div>
    </li>`;
  }).join('');
}

function renderStep1() {
  const b = formData.basic;
  return `
    <div class="wz-step-head">
      <h2>Basic Information</h2>
      <a href="#products" class="btn btn-secondary btn-sm">Cancel</a>
    </div>
    <div class="wz-form-grid">
      ${wizardField('Trade Name', 'tradeName', b.tradeName, { required: true, placeholder: 'Chakraveer' })}
      ${wizardField('Technical Name', 'technicalName', b.technicalName, { required: true, placeholder: 'Chlorantraniliprole 18.5% SC' })}
      ${wizardField('Category', 'category', b.category, {
        required: true,
        type: 'select',
        options: [{ value: '', label: 'Select category' }, ...CATEGORIES.map((c) => ({ value: c, label: c }))],
      })}
      ${wizardField('Sub Category', 'subCategory', b.subCategory, {
        type: 'select',
        options: [{ value: '', label: 'Select sub category' }, ...SUB_CATEGORIES.map((c) => ({ value: c, label: c }))],
      })}
      ${wizardField('Formulation Type', 'formulationType', b.formulationType, { placeholder: 'Chlorantraniliprole 18.5 % w/w' })}
      ${wizardField('Mode of Action', 'modeOfAction', b.modeOfAction, { placeholder: 'Ryanodine receptor activator' })}
      ${wizardField('Mode of Entry', 'modeOfEntry', b.modeOfEntry, { placeholder: 'Systemic & Contact' })}
      ${wizardField('Short Description', 'shortDescription', b.shortDescription, { type: 'textarea', rows: 2, max: 160, full: true })}
      ${wizardField('Long Description', 'longDescription', b.longDescription, { type: 'textarea', rows: 6, max: 1000, full: true })}
    </div>
    <div class="wz-flags">
      <label class="wz-check"><input type="checkbox" data-flag="featured" ${b.featured ? 'checked' : ''} /> Featured Product</label>
      <label class="wz-check"><input type="checkbox" data-flag="bestSeller" ${b.bestSeller ? 'checked' : ''} /> Best Seller</label>
      <label class="wz-check"><input type="checkbox" data-flag="trending" ${b.trending ? 'checked' : ''} /> Trending Product</label>
      <label class="wz-check"><input type="checkbox" data-flag="active" ${b.active ? 'checked' : ''} /> Active</label>
    </div>`;
}

function renderVariantsTable() {
  const rows = formData.basic.variants
    .map(
      (v, i) => `
    <tr data-variant-idx="${i}">
      <td><input type="text" class="wz-table-input" data-v="packSize" value="${escapeHtml(v.packSize)}" placeholder="250" /></td>
      <td><select class="wz-table-input" data-v="unit">${UNITS.map((u) => `<option value="${u}" ${v.unit === u ? 'selected' : ''}>${u}</option>`).join('')}</select></td>
      <td><input type="number" step="0.01" class="wz-table-input" data-v="mrp" value="${escapeHtml(v.mrp)}" /></td>
      <td><input type="number" step="0.01" class="wz-table-input" data-v="sellingPrice" value="${escapeHtml(v.sellingPrice)}" /></td>
      <td><input type="number" step="0.01" class="wz-table-input" data-v="dealerPrice" value="${escapeHtml(v.dealerPrice)}" /></td>
      <td><input type="number" class="wz-table-input" data-v="stock" value="${v.stock ?? 0}" /></td>
      <td><button type="button" class="action-icon" data-remove-variant="${i}" title="Remove">${icon('trash', 'icon-action')}</button></td>
    </tr>`
    )
    .join('');
  return rows;
}

function renderStep2() {
  const b = formData.basic;
  return `
    <div class="wz-step-head"><h2>Variants & Pricing</h2></div>
    <div class="wz-table-card">
      <table class="wz-variants-table">
        <thead>
          <tr>
            <th>Pack Size</th><th>Unit</th><th>MRP (₹)</th><th>Selling Price (₹)</th>
            <th>Dealer Price (₹)</th><th>Stock</th><th>Action</th>
          </tr>
        </thead>
        <tbody id="variants-tbody">${renderVariantsTable()}</tbody>
      </table>
      <button type="button" class="btn btn-outline-primary btn-sm" id="add-variant-btn">+ Add Variant</button>
    </div>
    <h3 class="wz-section-title">Other Details</h3>
    <div class="wz-form-grid">
      ${wizardField('SKU Prefix', 'skuPrefix', b.skuPrefix, { placeholder: 'KCH' })}
      ${wizardField('HSN Code', 'hsnCode', b.hsnCode, { placeholder: '3808' })}
      ${wizardField('GST %', 'gstPercent', b.gstPercent, { placeholder: '18' })}
      ${wizardField('Shelf Life', 'shelfLife', b.shelfLife, { placeholder: '2 Years' })}
      ${wizardField('Storage Conditions', 'storageConditions', b.storageConditions, { full: true, placeholder: 'Store in cool, dry place' })}
    </div>`;
}

function cropTagsHtml() {
  return (formData.aiMapping.crops || [])
    .map(
      (c) =>
        `<span class="wz-tag">${escapeHtml(c)}<button type="button" data-remove-crop="${escapeHtml(c)}" aria-label="Remove">×</button></span>`
    )
    .join('');
}

function renderStep3() {
  const ai = formData.aiMapping;
  const tab = draft.aiTab;
  const tabs = [
    { id: 'crop', label: 'Crop Mapping' },
    { id: 'pest', label: 'Pest Mapping' },
    { id: 'disease', label: 'Disease Mapping' },
    { id: 'usage', label: 'Usage Rules' },
  ];

  let panel = '';
  if (tab === 'crop') {
    panel = `
      <h3 class="wz-subsection">Add Crops</h3>
      <div class="wz-crop-bar">
        <input type="text" id="crop-search" class="wz-input" placeholder="Search crops…" list="crop-suggestions" />
        <datalist id="crop-suggestions">${CROP_SUGGESTIONS.map((c) => `<option value="${c}">`).join('')}</datalist>
        <button type="button" class="btn btn-primary btn-sm" id="add-crop-btn">+ Add Crop</button>
      </div>
      <div class="wz-tags" id="crop-tags">${cropTagsHtml()}</div>
      <h3 class="wz-subsection">Dosage & Usage (Per Acre)</h3>
      <div class="wz-form-grid">
        ${wizardField('Dosage', 'dosage', ai.dosage, { placeholder: '150 - 200 ml' })}
        ${wizardField('Water Volume', 'waterVolume', ai.waterVolume, { placeholder: '200 L' })}
        ${wizardField('Application Stage', 'applicationStage', ai.applicationStage, { placeholder: 'Vegetative - Flowering' })}
        ${wizardField('Spray Interval', 'sprayInterval', ai.sprayInterval, { placeholder: '10 - 12 Days' })}
        ${wizardField('Waiting Period (Days)', 'waitingPeriodDays', ai.waitingPeriodDays, { placeholder: '14 Days' })}
        ${wizardField('No. of Sprays', 'numberOfSprays', ai.numberOfSprays, { placeholder: '2 - 3' })}
      </div>
      <h3 class="wz-subsection">Compatibility</h3>
      <div class="wz-form-grid">
        ${wizardField('Compatible Products', 'compatibleProducts', ai.compatibleProducts, { type: 'textarea', placeholder: 'Sticker, Spreader, Micronutrient' })}
        ${wizardField('Incompatible Products', 'incompatibleProducts', ai.incompatibleProducts, { type: 'textarea', placeholder: 'Copper Based Products' })}
      </div>`;
  } else if (tab === 'pest') {
    panel = `
      ${wizardField('Target Pests', 'targetPests', ai.targetPests || '', { type: 'textarea', full: true, placeholder: 'Stem borer, leaf folder…' })}
      ${wizardField('Pest / disease tags', 'diseasePestTags', ai.diseasePestTags || '', { placeholder: 'Comma-separated tags' })}`;
  } else if (tab === 'disease') {
    panel = `
      ${wizardField('Target Diseases', 'targetDiseases', ai.targetDiseases || '', { type: 'textarea', full: true })}
      ${wizardField('Symptoms controlled', 'symptomsControlled', ai.symptomsControlled || '', { type: 'textarea', full: true })}`;
  } else {
    panel = `
      ${wizardField('Preventive / Curative', 'preventiveCurative', ai.preventiveCurative || '', { placeholder: 'Preventive' })}
      ${wizardField('Weather suitability', 'weatherSuitability', ai.weatherSuitability || '', { placeholder: 'Avoid rain 6h' })}
      ${wizardField('AI recommendation priority', 'aiPriority', ai.aiPriority ?? '', { type: 'number', placeholder: '1-100' })}`;
  }

  return `
    <div class="wz-step-head"><h2>AI Mapping – Crop, Pest & Disease</h2></div>
    <div class="wz-subtabs">
      ${tabs.map((t) => `<button type="button" class="wz-subtab ${t.id === tab ? 'active' : ''}" data-ai-tab="${t.id}">${t.label}</button>`).join('')}
    </div>
    <div class="wz-subtab-panel">${panel}</div>`;
}

function renderStep4() {
  const imgs = formData.images || [];
  const gallery = imgs
    .map(
      (img) => `
    <div class="product-image-card">
      <img src="${escapeHtml(img.src)}" alt="" />
      ${img.id && draft.productId ? `<button type="button" class="btn btn-danger btn-sm product-image-remove" data-image-id="${escapeHtml(img.id)}">Remove</button>` : ''}
    </div>`
    )
    .join('');

  const note = !draft.productId
    ? '<p class="wz-hint">Product images can be uploaded after you save a draft (complete Step 2 and click Next), or on final publish.</p>'
    : '';

  return `
    <div class="wz-step-head"><h2>Media & Documents</h2></div>
    ${note}
    <h3 class="wz-subsection">Product Images</h3>
    <div class="product-image-gallery">${gallery || '<p class="muted">No images yet</p>'}</div>
    ${
      draft.productId
        ? `<div class="product-image-upload">
        <input type="file" id="product-image-file" accept="image/*" />
        <input type="text" id="product-image-alt" class="wz-input mt-2" placeholder="Alt text" />
        <button type="button" class="btn btn-secondary btn-sm mt-2" id="product-image-upload-btn">Upload image</button>
      </div>`
        : ''
    }
    <h3 class="wz-subsection">Videos & Documents</h3>
    <div class="wz-form-grid">
      ${wizardField('Product video URL', 'videoUrl', formData.seo.videoUrl, { placeholder: 'https://youtube.com/…' })}
      ${wizardField('YouTube link', 'youtubeLink', formData.seo.youtubeLink)}
      ${wizardField('Label image / PDF URL', 'labelPdfUrl', formData.seo.labelPdfUrl)}
      ${wizardField('Technical sheet PDF URL', 'technicalPdfUrl', formData.seo.technicalPdfUrl)}
      ${wizardField('Safety / MSDS PDF URL', 'safetyPdfUrl', formData.seo.safetyPdfUrl)}
    </div>`;
}

function renderStep5() {
  const s = formData.seo;
  const b = formData.basic;
  return `
    <div class="wz-step-head"><h2>SEO & Publish</h2></div>
    <div class="wz-form-grid">
      ${wizardField('SEO Title', 'seoTitle', s.seoTitle || b.tradeName, { full: true })}
      ${wizardField('Meta Description', 'seoDescription', s.seoDescription, { type: 'textarea', rows: 3, full: true })}
      ${wizardField('SEO Keywords', 'seoKeywords', s.seoKeywords, { placeholder: 'Comma-separated' })}
      ${wizardField('URL Handle', 'urlHandle', s.urlHandle, { placeholder: 'chakraveer-insecticide' })}
    </div>
    <div class="wz-publish-box">
      <h3>Publish settings</h3>
      <p class="muted">Product will be created/updated on Shopify with all variants and intelligence data.</p>
      <label class="wz-field"><span class="label">Shopify status</span>
        <select id="publish-status" class="wz-input wz-select">
          <option value="active" ${formData.basic.active ? 'selected' : ''}>Active (published)</option>
          <option value="draft" ${!formData.basic.active ? 'selected' : ''}>Draft</option>
        </select>
      </label>
    </div>`;
}

function renderStepContent() {
  switch (draft.step) {
    case 1:
      return renderStep1();
    case 2:
      return renderStep2();
    case 3:
      return renderStep3();
    case 4:
      return renderStep4();
    case 5:
      return renderStep5();
    default:
      return '';
  }
}

function collectVariantsFromTable() {
  const rows = document.querySelectorAll('#variants-tbody tr');
  const variants = [];
  rows.forEach((row) => {
    const get = (name) => row.querySelector(`[data-v="${name}"]`)?.value ?? '';
    variants.push({
      id: formData.basic.variants[Number(row.dataset.variantIdx)]?.id,
      packSize: get('packSize'),
      unit: get('unit'),
      mrp: get('mrp'),
      sellingPrice: get('sellingPrice'),
      dealerPrice: get('dealerPrice'),
      stock: Number(get('stock')) || 0,
      sku: formData.basic.variants[Number(row.dataset.variantIdx)]?.sku,
    });
  });
  formData.basic.variants = variants.length ? variants : [emptyVariant()];
}

function collectFlags() {
  document.querySelectorAll('[data-flag]').forEach((el) => {
    formData.basic[el.dataset.flag] = el.checked;
  });
}

function buildTags() {
  const tags = [];
  if (formData.basic.featured) tags.push('featured');
  if (formData.basic.bestSeller) tags.push('best-seller');
  if (formData.basic.trending) tags.push('trending');
  if (formData.aiMapping.crops?.length) tags.push(...formData.aiMapping.crops);
  return tags.join(', ');
}

function buildPayload() {
  readFormIntoData();
  collectFlags();
  if (draft.step >= 2) collectVariantsFromTable();

  const title =
    formData.basic.tradeName?.trim() ||
    formData.basic.technicalName?.trim() ||
    'New product';

  const statusEl = $('#publish-status');
  const status = statusEl?.value || (formData.basic.active ? 'active' : 'draft');

  return {
    title,
    bodyHtml: formData.basic.longDescription || '',
    vendor: formData.product.vendor || 'Morbeez',
    productType: formData.basic.category || '',
    tags: buildTags(),
    status,
    skuPrefix: formData.basic.skuPrefix || '',
    variants: formData.basic.variants.map((v) => ({
      id: v.id,
      packSize: String(v.packSize),
      unit: v.unit || 'ml',
      mrp: String(v.mrp || '0'),
      sellingPrice: String(v.sellingPrice || '0'),
      dealerPrice: String(v.dealerPrice || ''),
      stock: Number(v.stock) || 0,
      sku: v.sku,
    })),
    intelligence: {
      basic: {
        ...formData.basic,
        variants: formData.basic.variants,
        shortDescription: formData.basic.shortDescription,
        hsnCode: formData.basic.hsnCode,
        gstPercent: formData.basic.gstPercent,
        shelfLife: formData.basic.shelfLife,
        storageConditions: formData.basic.storageConditions,
      },
      agriculture: {
        tradeName: formData.basic.tradeName,
        technicalName: formData.basic.technicalName,
        category: formData.basic.category,
        subCategory: formData.basic.subCategory,
        productType: formData.basic.formulationType,
        modeOfAction: formData.basic.modeOfAction,
        modeOfEntry: formData.basic.modeOfEntry,
        targetPests: formData.aiMapping.targetPests,
        targetDiseases: formData.aiMapping.targetDiseases,
        recommendedCrops: (formData.aiMapping.crops || []).join(', '),
        dosePerAcre: formData.aiMapping.dosage,
        waitingPeriod: formData.aiMapping.waitingPeriodDays,
        compatibility: formData.aiMapping.compatibleProducts,
        incompatibleProducts: formData.aiMapping.incompatibleProducts,
      },
      aiMapping: formData.aiMapping,
      seo: formData.seo,
      crossSell: formData.crossSell,
    },
  };
}

async function saveDraftIfNeeded() {
  if (draft.productId) return draft.productId;
  readFormIntoData();
  collectFlags();
  if (!formData.basic.tradeName?.trim() && !formData.basic.technicalName?.trim()) {
    showToast('Enter trade or technical name first', 'error');
    return null;
  }
  const payload = buildPayload();
  payload.status = 'draft';
  payload.variants = payload.variants.length ? payload.variants : [{ ...emptyVariant(), packSize: '1', unit: 'L', sellingPrice: '0', mrp: '0', stock: 0 }];
  try {
    const res = await api('/console/api/v1/products/wizard', {
      method: 'POST',
      body: JSON.stringify(payload),
    });
    draft.productId = res.product.id;
    formData.images = res.product.images || [];
    showToast('Draft saved — you can upload media');
    return draft.productId;
  } catch (err) {
    showToast(err.message, 'error');
    return null;
  }
}

async function publishProduct() {
  const payload = buildPayload();
  try {
    if (draft.productId) {
      await api(`/console/api/v1/products/${draft.productId}/wizard`, {
        method: 'PUT',
        body: JSON.stringify(payload),
      });
      showToast('Product published');
      location.hash = 'products';
    } else {
      const res = await api('/console/api/v1/products/wizard', {
        method: 'POST',
        body: JSON.stringify(payload),
      });
      showToast('Product created');
      location.hash = `products/edit/${res.product.id}`;
    }
  } catch (err) {
    showToast(err.message, 'error');
  }
}

function bindWizardEvents(root) {
  root.querySelectorAll('[data-goto-step]').forEach((el) => {
    el.addEventListener('click', () => {
      const n = Number(el.dataset.gotoStep);
      if (n < draft.step) {
        readFormIntoData();
        collectFlags();
        if (draft.step === 2) collectVariantsFromTable();
        draft.step = n;
        renderWizard(root.parentElement);
      }
    });
  });

  root.querySelectorAll('[data-ai-tab]').forEach((btn) => {
    btn.addEventListener('click', () => {
      readFormIntoData();
      draft.aiTab = btn.dataset.aiTab;
      $('#wz-panel').innerHTML = renderStepContent();
      bindWizardEvents(root);
    });
  });

  $('#add-variant-btn')?.addEventListener('click', () => {
    collectVariantsFromTable();
    formData.basic.variants.push(emptyVariant());
    $('#variants-tbody').innerHTML = renderVariantsTable();
    bindWizardEvents(root);
  });

  root.querySelectorAll('[data-remove-variant]').forEach((btn) => {
    btn.addEventListener('click', () => {
      collectVariantsFromTable();
      const idx = Number(btn.dataset.removeVariant);
      if (formData.basic.variants.length <= 1) {
        showToast('At least one variant required', 'error');
        return;
      }
      formData.basic.variants.splice(idx, 1);
      $('#variants-tbody').innerHTML = renderVariantsTable();
      bindWizardEvents(root);
    });
  });

  $('#add-crop-btn')?.addEventListener('click', () => {
    const val = $('#crop-search')?.value?.trim();
    if (!val) return;
    if (!formData.aiMapping.crops.includes(val)) formData.aiMapping.crops.push(val);
    $('#crop-search').value = '';
    $('#crop-tags').innerHTML = cropTagsHtml();
    bindWizardEvents(root);
  });

  root.querySelectorAll('[data-remove-crop]').forEach((btn) => {
    btn.addEventListener('click', () => {
      const c = btn.dataset.removeCrop;
      formData.aiMapping.crops = formData.aiMapping.crops.filter((x) => x !== c);
      $('#crop-tags').innerHTML = cropTagsHtml();
      bindWizardEvents(root);
    });
  });

  document.querySelectorAll('[data-counter-for]').forEach((counter) => {
    const id = counter.dataset.counterFor;
    const ta = $(`#${id}`);
    if (!ta) return;
    const max = id === 'shortDescription' ? 160 : 1000;
    const upd = () => {
      counter.textContent = `${ta.value.length} / ${max}`;
    };
    ta.addEventListener('input', upd);
    upd();
  });

  $('#wz-back')?.addEventListener('click', () => {
    readFormIntoData();
    collectFlags();
    if (draft.step === 2) collectVariantsFromTable();
    if (draft.step > 1) {
      draft.step--;
      renderWizard(root.parentElement);
    }
  });

  $('#wz-next')?.addEventListener('click', async () => {
    readFormIntoData();
    collectFlags();
    if (draft.step === 1) {
      if (!formData.basic.tradeName?.trim()) {
        showToast('Trade name is required', 'error');
        return;
      }
    }
    if (draft.step === 2) {
      collectVariantsFromTable();
      const valid = formData.basic.variants.some((v) => v.packSize && v.sellingPrice);
      if (!valid) {
        showToast('Add at least one variant with pack size and selling price', 'error');
        return;
      }
      if (!draft.productId) await saveDraftIfNeeded();
    }
    if (draft.step === 4 && !draft.productId) {
      await saveDraftIfNeeded();
    }
    if (draft.step < 5) {
      draft.step++;
      renderWizard(root.parentElement);
    }
  });

  $('#wz-publish')?.addEventListener('click', () => publishProduct());

  bindImageUpload();
}

function bindImageUpload() {
  $('#product-image-upload-btn')?.addEventListener('click', async () => {
    if (!draft.productId) {
      await saveDraftIfNeeded();
      if (!draft.productId) return;
    }
    const file = $('#product-image-file')?.files?.[0];
    if (!file) return showToast('Choose an image', 'error');
    try {
      await api(`/console/api/v1/products/${draft.productId}/images`, {
        method: 'POST',
        body: JSON.stringify({
          fileName: file.name,
          mimeType: file.type,
          dataBase64: await readFileAsBase64(file),
          alt: $('#product-image-alt')?.value?.trim(),
        }),
      });
      const { product } = await api(`/console/api/v1/products/${draft.productId}`);
      formData.images = product.images || [];
      showToast('Image uploaded');
      renderWizard($('#main-content'));
    } catch (err) {
      showToast(err.message, 'error');
    }
  });

  document.querySelectorAll('.product-image-remove').forEach((btn) => {
    btn.addEventListener('click', async () => {
      if (!confirm('Remove image?')) return;
      try {
        await api(`/console/api/v1/products/${draft.productId}/images/${btn.dataset.imageId}`, {
          method: 'DELETE',
        });
        const { product } = await api(`/console/api/v1/products/${draft.productId}`);
        formData.images = product.images || [];
        renderWizard($('#main-content'));
      } catch (err) {
        showToast(err.message, 'error');
      }
    });
  });
}

function renderWizard(container) {
  const isLast = draft.step === 5;
  container.innerHTML = `
    <div class="product-wizard">
      <aside class="wz-sidebar">
        <ul class="wz-steps">${renderStepper()}</ul>
      </aside>
      <div class="wz-main">
        <div class="wz-panel" id="wz-panel">${renderStepContent()}</div>
        <footer class="wz-footer">
          ${draft.step > 1 ? '<button type="button" class="btn btn-secondary" id="wz-back">Back</button>' : '<span></span>'}
          ${isLast ? '<button type="button" class="btn btn-primary" id="wz-publish">Publish Product</button>' : '<button type="button" class="btn btn-primary" id="wz-next">Next</button>'}
        </footer>
      </div>
    </div>`;
  bindWizardEvents(container);
}

export async function renderProductWizard(productId) {
  if (!canEdit()) {
    $('#main-content').innerHTML = '<div class="alert alert-error">You do not have permission to edit products.</div>';
    return;
  }

  const el = $('#main-content');
  el.innerHTML = '<div class="products-loading"><div class="spinner"></div></div>';

  draft.step = 1;
  draft.productId = productId || null;
  draft.aiTab = 'crop';
  formData = defaultDraft();

  document.body.classList.add('route-product-wizard');
  $('#page-title').textContent = productId ? 'Edit Product' : 'Add Product';

  if (productId) {
    try {
      const [pRes, iRes] = await Promise.all([
        api(`/console/api/v1/products/${productId}`),
        api(`/console/api/v1/products/${productId}/intelligence`).catch(() => ({ intelligence: null })),
      ]);
      mergeIntel(iRes.intelligence);
      loadFromProduct(pRes.product);
    } catch (err) {
      el.innerHTML = `<div class="alert alert-error">${escapeHtml(err.message)}</div>`;
      return;
    }
  }

  renderWizard(el);
}
