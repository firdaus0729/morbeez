import { $, api, state, escapeHtml, formatInrFull, canEdit, showToast } from '../core.js';
import { icon } from '../icons.js';
import { enrichLeadData } from './telecaller-lead-demo.js';
import {
  showAddBlockModal,
  showAddInteractionModal,
  showAddRecommendationModal,
  showAddFieldFindingModal,
} from './crm-ui.js';

export const LEAD_TABS = [
  { id: 'overview', label: 'Overview' },
  { id: 'interactions', label: 'Interactions' },
  { id: 'calls', label: 'Calls' },
  { id: 'whatsapp', label: 'WhatsApp' },
  { id: 'orders', label: 'Orders' },
  { id: 'recommendations', label: 'Recommendations' },
  { id: 'field-findings', label: 'Field Findings' },
  { id: 'agronomist', label: 'Agronomist' },
  { id: 'purchase-history', label: 'Purchase History' },
  { id: 'tasks', label: 'Tasks' },
  { id: 'follow-ups', label: 'Follow-ups' },
  { id: 'blocks', label: 'Blocks' },
];

const STAGE_TONE = {
  new_lead: 'stage-new',
  interested: 'stage-interested',
  follow_up: 'stage-follow',
  recommendation: 'stage-rec',
  order_placed: 'stage-order',
  repeat_customer: 'stage-repeat',
};

function stageBadge(stage, label) {
  const tone = STAGE_TONE[stage] || 'stage-new';
  return `<span class="tc-stage ${tone}">${escapeHtml(label)}</span>`;
}

function ixStatus(tone, label) {
  return `<span class="ld-ix-status ld-ix-status-${tone}">${escapeHtml(label)}</span>`;
}

function orderStatus(tone, label) {
  return `<span class="ld-order-status ld-order-status-${tone}">${escapeHtml(label)}</span>`;
}

function tabHeader(title, desc, actions = '') {
  return `<div class="ld-tab-header">
    <div><h2>${escapeHtml(title)}</h2>${desc ? `<p class="ld-tab-desc">${desc}</p>` : ''}</div>
    ${actions ? `<div class="ld-tab-actions">${actions}</div>` : ''}
  </div>`;
}

function tablePager(from, to, total, pages, page, limitId, limit) {
  const pageBtns = Array.from({ length: Math.min(pages, 5) }, (_, i) => i + 1)
    .map((n) => `<button type="button" class="products-page-btn ${n === page ? 'active' : ''}" data-ld-page="${n}">${n}</button>`)
    .join('');
  return `<div class="products-table-footer ld-findings-footer">
    <p class="products-showing">Showing <strong>${from}</strong> to <strong>${to}</strong> of <strong>${total}</strong></p>
    ${pages > 1 ? `<div class="products-pagination">${pageBtns}</div>` : ''}
    <div class="ld-rows-per-page"><label>Rows per page</label>
      <select id="${limitId}" class="products-select"><option value="10" ${limit === 10 ? 'selected' : ''}>10</option><option value="20" ${limit === 20 ? 'selected' : ''}>20</option></select>
    </div>
  </div>`;
}

function renderParams(params) {
  if (!params?.length) return '—';
  return `<ul class="ld-params">${params.map((p) => `<li><span>${escapeHtml(p.label)}</span> ${escapeHtml(p.value)}</li>`).join('')}</ul>`;
}

function renderPhotoThumbs(count) {
  const n = Math.min(count, 3);
  const extra = count > 3 ? count - 3 : 0;
  let html = '<div class="ld-photo-thumbs">';
  for (let i = 0; i < n; i++) html += '<span class="ld-photo-thumb"></span>';
  if (extra > 0) html += `<span class="ld-photo-more">+${extra}</span>`;
  return html + '</div>';
}

function diseaseTag(tone, label) {
  return `<span class="ld-disease ld-disease-${tone}">${escapeHtml(label)}</span>`;
}

export function renderLeadHeader(d, opts = {}) {
  const l = d.lead;
  const f = d.farmer;
  const phone = l.phone || '';
  const wa = phone ? `https://wa.me/91${String(phone).replace(/\D/g, '').slice(-10)}` : '#';
  const back = opts.inPane
    ? ''
    : `<a href="#telecaller" class="ld-back">${icon('arrowLeft', 'icon-back')} Back to Leads</a>`;

  return `${back}
    <header class="ld-profile-header ${opts.compact ? 'ld-profile-header-compact' : ''}">
      <div class="ld-profile-main">
        <span class="ld-avatar-xl">${escapeHtml(l.farmerInitials)}</span>
        <div>
          <div class="ld-name-row">
            <h1>${escapeHtml(l.farmerName)}</h1>
            ${stageBadge(l.stage, l.stageLabel)}
            <span class="ld-status-pill ld-status-active">Active</span>
            <span class="ld-rating">★ ${Number(l.leadScore).toFixed(1)}</span>
          </div>
          <p class="ld-meta-line">
            ${phone ? `${icon('phone', 'ld-meta-icon')} ${escapeHtml(phone)}` : ''}
            <span class="ld-meta-sep">·</span>${icon('location', 'ld-meta-icon')}
            ${escapeHtml([l.district, l.state].filter(Boolean).join(', ') || f.territory)}
            <span class="ld-meta-sep">·</span>Language: ${escapeHtml(f.language || 'Malayalam')}
          </p>
        </div>
      </div>
      <div class="ld-profile-actions">
        ${phone ? `<a href="tel:${escapeHtml(phone)}" class="btn btn-primary btn-sm">${icon('phone', 'icon-btn')} Call</a>` : ''}
        <a href="${wa}" target="_blank" rel="noopener" class="btn btn-primary btn-sm ld-btn-wa">${icon('whatsapp', 'icon-btn')} WhatsApp</a>
        ${canEdit() ? `<button type="button" class="btn btn-secondary btn-sm" id="ld-add-note">Add Note</button>` : ''}
        <button type="button" class="btn btn-secondary btn-sm">More ▾</button>
      </div>
    </header>`;
}

function renderOverviewTab(d) {
  const f = d.farmer;
  const fp = d.farmerProfile || {};
  const lo = d.lastOrder || {};
  const timeline = (d.timeline || []).slice(0, 4);
  const nf = d.nextFollowUp;

  return `<div class="ld-overview-mockup">
    <div class="ld-ov-card">
      <div class="ld-ov-card-head"><h3>Farmer Overview</h3><a href="#" class="ld-ov-link">View Profile</a></div>
      <dl class="ld-ov-dl">${[
        ['Name', f.name], ['Father Name', fp.fatherName || '—'], ['Mobile', f.phone], ['WhatsApp', fp.whatsapp || f.phone],
        ['Email', fp.email || '—'], ['Language', f.language], ['Territory', f.territory], ['Village', fp.village || '—'],
        ['Primary Crop', f.crop], ['Farm Size', fp.farmSize || f.acreage], ['Irrigation', f.irrigation],
      ].map(([k, v]) => `<div><dt>${k}</dt><dd>${escapeHtml(v || '—')}</dd></div>`).join('')}</dl>
    </div>
    <div class="ld-ov-card">
      <div class="ld-ov-card-head"><h3>Farm Overview</h3><button type="button" class="btn btn-secondary btn-sm">View Farm Details</button></div>
      <div class="ld-ov-stats">
        <div><span>Total Blocks</span><strong>${d.farmOverview?.totalBlocks ?? 3}</strong></div>
        <div><span>Total Acre</span><strong>${escapeHtml(String(d.farmOverview?.totalArea || '5.6 acres'))}</strong></div>
        <div><span>Primary Crop</span><strong>${escapeHtml(d.farmOverview?.primaryCrop || f.crop)}</strong></div>
        <div><span>Soil Type</span><strong>${escapeHtml(d.farmOverview?.soilType || 'Loamy')}</strong></div>
      </div>
      <div class="ld-ov-soil"><span>Soil Report</span><strong>${escapeHtml(d.soilReport?.reportId || 'SR-2025-001')}</strong> · ${escapeHtml(d.soilReport?.health || 'Moderate')} · pH ${escapeHtml(d.soilReport?.ph || '6.8')}</div>
    </div>
    <div class="ld-ov-card">
      <div class="ld-ov-card-head"><h3>Last Order</h3></div>
      <div class="ld-last-order">
        <span class="ld-product-thumb"></span>
        <div><strong>${escapeHtml(lo.product)}</strong><p class="tc-muted">${escapeHtml(lo.qty)} · ${escapeHtml(lo.date)}</p>
        <p>${formatInrFull(lo.amount)} · <span class="ld-ix-status ld-ix-status-success">${escapeHtml(lo.status)}</span></p></div>
      </div>
    </div>
    <div class="ld-ov-card ld-ov-timeline-card">
      <div class="ld-ov-card-head"><h3>Interaction Timeline</h3><button type="button" class="ld-tab-link" data-goto-tab="interactions">View All</button></div>
      <ul class="ld-ov-timeline">${timeline.length ? timeline.map((t) => `<li><strong>${escapeHtml(t.title)}</strong><p>${escapeHtml((t.detail || '').slice(0, 60))}</p><time>${escapeHtml(t.atLabel)}</time></li>`).join('') : '<li class="tc-muted">No interactions yet</li>'}</ul>
    </div>
    <div class="ld-ov-card ld-ov-follow-card">
      <div class="ld-ov-card-head"><h3>Next Follow-up</h3></div>
      ${nf ? `<p class="ld-ov-follow-date">${escapeHtml(nf.dueLabel)}</p><p><strong>${escapeHtml(nf.title)}</strong></p><p class="tc-muted">${escapeHtml(nf.notes || 'Call · High priority')}</p>` : '<p class="tc-muted">No follow-up scheduled</p>'}
    </div>
  </div>
  ${renderQuickActions(d)}`;
}

function renderQuickActions(d) {
  const l = d.lead;
  const stages = d.stages || [];
  return `<div class="ld-quick-actions">
    <h3>Quick Actions</h3>
    <div class="ld-quick-grid">
      <div class="ld-quick-col">
        <label>Lead Stage</label>
        <p class="ld-quick-current">${escapeHtml(l.stageLabel)}</p>
        <select class="products-select" id="ld-quick-stage">${stages.map((s) => `<option value="${s.id}" ${s.active ? 'selected' : ''}>${escapeHtml(s.label)}</option>`).join('')}</select>
        <button type="button" class="btn btn-primary btn-sm btn-block" id="ld-update-stage">Update Stage</button>
      </div>
      <div class="ld-quick-col">
        <label>Next Follow-up</label>
        <input type="datetime-local" class="input" id="ld-quick-follow-date" />
        <select class="products-select"><option>Call</option><option>WhatsApp</option><option>Visit</option></select>
        <select class="products-select"><option>High</option><option>Normal</option><option>Low</option></select>
        <textarea class="input" rows="2" placeholder="Notes"></textarea>
        <button type="button" class="btn btn-primary btn-sm btn-block">Update Follow-up</button>
      </div>
      <div class="ld-quick-col">
        <label>Change Stage</label>
        <select class="products-select"><option>New Stage</option>${stages.map((s) => `<option>${escapeHtml(s.label)}</option>`).join('')}</select>
        <textarea class="input" rows="3" placeholder="Reason for stage change"></textarea>
        <button type="button" class="btn btn-secondary btn-sm btn-block">Change Stage</button>
      </div>
    </div>
  </div>`;
}

function renderInteractionsTab(d) {
  const rows = (d.interactions || []).map(
    (ix) => `<tr>
      <td class="ld-col-datetime">${escapeHtml(ix.atLabel)}</td>
      <td><span class="ld-ix-type">${icon(ix.icon || 'phone', 'ld-ix-icon')} ${escapeHtml(ix.typeLabel)}</span></td>
      <td><strong>${escapeHtml(ix.by)}</strong><br><small class="tc-muted">${escapeHtml(ix.role)}</small></td>
      <td>${escapeHtml(ix.summary)}</td>
      <td>${ix.nextDate ? `<strong>${escapeHtml(ix.nextAction)}</strong><br><small>${escapeHtml(ix.nextDate)}</small>` : '—'}</td>
      <td>${ixStatus(ix.statusTone, ix.status)}</td>
      <td class="tc-muted">${escapeHtml(ix.block)}</td>
      <td class="col-actions"><button type="button" class="action-icon ld-more-btn">⋮</button></td>
    </tr>`
  ).join('');
  const total = d.interactions?.length || 0;
  return `${tabHeader('Interactions', 'All activities and interactions with this farmer.', canEdit() ? '<button type="button" class="btn btn-primary btn-sm" id="ld-add-interaction">+ Add Interaction</button><button type="button" class="btn btn-secondary btn-sm">Filter</button>' : '')}
    <div class="ld-filter-row">
      <select class="products-select"><option>Interaction Type (All)</option></select>
      <select class="products-select"><option>Employee (All)</option></select>
      <input type="text" class="input" value="01 May 2024 – 24 May 2024" readonly />
      <select class="products-select"><option>Status (All)</option></select>
      <select class="products-select"><option>Block (All)</option></select>
      <button type="button" class="btn btn-secondary btn-sm">Reset</button>
    </div>
    <div class="products-table-card ld-table-card"><div class="table-wrap"><table class="products-table">
      <thead><tr><th>Date &amp; Time</th><th>Interaction Type</th><th>Done By</th><th>Summary</th><th>Next Action</th><th>Status</th><th>Block</th><th></th></tr></thead>
      <tbody>${rows}</tbody></table></div>
      ${tablePager(1, Math.min(10, total), total, Math.ceil(total / 10) || 1, 1, 'ld-ix-limit', 10)}
    </div>`;
}

function renderRecommendationsTab(d) {
  const recs = d.recommendations || [];
  const rows = recs
    .map(
      (r) => `<tr>
      <td>${escapeHtml(r.recId || r.id)}</td>
      <td class="ld-col-datetime">${escapeHtml(r.dateLabel || '')}</td>
      <td><strong>${escapeHtml(r.blockName)}</strong><br><span class="tc-muted">${escapeHtml(r.cropType)}</span></td>
      <td>${escapeHtml(r.problem || '—')}</td>
      <td>${escapeHtml(r.recommendation || '')}</td>
      <td class="tc-muted">${escapeHtml(r.dosage || '—')}</td>
      <td>${escapeHtml(r.applicationMethod || '—')}</td>
      <td>${escapeHtml(r.recommendedBy || '')}</td>
      <td>${ixStatus(r.statusTone, r.status)}</td>
      <td class="tc-muted">${escapeHtml(r.followUpLabel || '—')}</td>
      <td class="col-actions"><button type="button" class="action-icon ld-more-btn">⋮</button></td>
    </tr>`
    )
    .join('');
  return `${tabHeader(
    'Recommendations',
    'Product and agronomy recommendations for this farmer.',
    canEdit()
      ? '<button type="button" class="btn btn-secondary btn-sm">Filter</button><button type="button" class="btn btn-secondary btn-sm">Export</button><button type="button" class="btn btn-primary btn-sm" id="ld-add-recommendation">+ Add Recommendation</button>'
      : ''
  )}
    <div class="products-table-card ld-table-card"><div class="table-wrap"><table class="products-table">
      <thead><tr><th>Rec ID</th><th>Date</th><th>Block / Crop</th><th>Problem</th><th>Recommendation</th><th>Dosage</th><th>Application</th><th>By</th><th>Status</th><th>Follow-up</th><th></th></tr></thead>
      <tbody>${rows || '<tr><td colspan="11" class="empty-state">No recommendations yet</td></tr>'}</tbody>
    </table></div></div>`;
}

function renderOrdersTab(d) {
  const orders = d.ordersDetailed || [];
  const rows = orders.map(
    (o) => `<tr>
      <td><a href="#" class="ld-order-id">${escapeHtml(o.id)}</a></td>
      <td class="ld-col-datetime">${escapeHtml(o.dateLabel)}</td>
      <td><div class="ld-order-product"><span class="ld-product-thumb"></span>${escapeHtml(o.product)}</div></td>
      <td>${o.qty}</td>
      <td><strong>${formatInrFull(o.amount)}</strong></td>
      <td>${orderStatus(o.statusTone, o.status)}</td>
      <td class="tc-muted">${escapeHtml(o.payment)}</td>
      <td class="tc-muted">${escapeHtml(o.deliveryDate)}<br>${escapeHtml(o.deliveryBy)}</td>
      <td>${escapeHtml(o.block)}</td>
      <td class="col-actions">${icon('eye', 'icon-action')} <button class="action-icon ld-more-btn">⋮</button></td>
    </tr>`
  ).join('');
  return `${tabHeader('Orders', 'All orders placed by this farmer.', '<button type="button" class="btn btn-secondary btn-sm">Filter</button><button type="button" class="btn btn-secondary btn-sm">Export</button><button type="button" class="btn btn-primary btn-sm">+ New Order</button>')}
    <div class="products-table-card ld-table-card"><div class="table-wrap"><table class="products-table ld-orders-table">
      <thead><tr><th>Order ID</th><th>Order Date</th><th>Products</th><th>Qty</th><th>Amount (₹)</th><th>Status</th><th>Payment</th><th>Delivery</th><th>Block</th><th></th></tr></thead>
      <tbody>${rows || '<tr><td colspan="10" class="empty-state">No orders</td></tr>'}</tbody></table></div>
      ${tablePager(1, orders.length, orders.length, 1, 1, 'ld-ord-limit', 10)}
    </div>`;
}

function renderFieldFindingsTab(ffData) {
  const findings = ffData?.findings || [];
  const pg = ffData?.pagination || { page: 1, limit: 10, total: 0, pages: 1 };
  const rows = findings.map(
    (f) => `<tr>
      <td class="ld-col-datetime">${escapeHtml(f.visitedLabel || '—')}</td>
      <td><strong>${escapeHtml(f.blockName)}</strong><br><span class="tc-muted">${escapeHtml(f.cropType)}</span></td>
      <td><div class="ld-agronomist-cell"><span class="tc-avatar-sm">${escapeHtml(f.agronomistInitials)}</span><div><strong>${escapeHtml(f.agronomistName)}</strong><br><small>${escapeHtml(f.agronomistRole)}</small></div></div></td>
      <td class="ld-col-obs">${escapeHtml(f.observations || '—')}</td>
      <td class="ld-col-params">${renderParams(f.parameters)}</td>
      <td>${diseaseTag(f.diseaseTone, f.diseasePest)}</td>
      <td class="ld-col-action">${escapeHtml(f.actionTaken || '—')}</td>
      <td class="tc-muted">${escapeHtml(f.followUpLabel || '—')}</td>
      <td>${renderPhotoThumbs(f.photoCount || 0)}</td>
      <td class="col-actions"><button type="button" class="action-icon">${icon('eye', 'icon-action')}</button><button class="action-icon ld-more-btn">⋮</button></td>
    </tr>`
  ).join('');
  const from = pg.total ? (pg.page - 1) * pg.limit + 1 : 0;
  const to = Math.min(pg.page * pg.limit, pg.total);
  return `${tabHeader('Field Findings', 'All field observations and visit findings recorded by agronomists.', '<button class="btn btn-secondary btn-sm">Filter</button><button class="btn btn-secondary btn-sm">Export</button><button type="button" class="btn btn-primary btn-sm" id="ld-add-finding">+ Add Field Finding</button>')}
    <div class="products-table-card ld-table-card"><div class="table-wrap"><table class="products-table ld-findings-table">
      <thead><tr><th>Date &amp; Time</th><th>Block / Crop</th><th>Agronomist</th><th>Observations</th><th>Parameters</th><th>Disease / Pest</th><th>Action Taken</th><th>Next Follow-up</th><th>Photos</th><th></th></tr></thead>
      <tbody>${rows || '<tr><td colspan="10" class="empty-state">No field findings</td></tr>'}</tbody></table></div>
      ${tablePager(from, to, pg.total, pg.pages, pg.page, 'ld-ff-limit', pg.limit)}
    </div>`;
}

function renderAgronomistTab(d) {
  const ag = d.agronomist || {};
  return `${tabHeader('Agronomist', 'Primary agronomist assigned to this farmer.')}
    <div class="ld-agro-card">
      <div class="ld-agro-grid">${[
        ['Agronomist Name', ag.name], ['Employee ID', ag.employeeId], ['Mobile', ag.mobile], ['Email', ag.email],
        ['Specialization', ag.specialization], ['Assigned Since', ag.assignedSince], ['Assigned Blocks', ag.assignedBlocks],
        ['Last Review', ag.lastReview], ['Next Visit', ag.nextVisit], ['Status', '<span class="ld-ix-status ld-ix-status-success">Active</span>'],
      ].map(([k, v]) => `<div><dt>${k}</dt><dd>${typeof v === 'string' && v.startsWith('<') ? v : escapeHtml(String(v))}</dd></div>`).join('')}</div>
      <div class="ld-agro-actions">
        <button type="button" class="btn btn-secondary btn-sm">${icon('phone', 'icon-btn')} Call Agronomist</button>
        <button type="button" class="btn btn-secondary btn-sm">${icon('whatsapp', 'icon-btn')} WhatsApp</button>
        <button type="button" class="btn btn-secondary btn-sm">Schedule Visit</button>
        <button type="button" class="btn btn-secondary btn-sm">Reassign Agronomist</button>
      </div>
    </div>
    <div class="ld-agro-bottom">
      <div class="ld-ov-card"><h3>Recent Activities</h3><table class="products-table"><thead><tr><th>Date</th><th>Activity</th><th>Block</th><th>Notes</th></tr></thead><tbody>
        ${(ag.activities || []).map((a) => `<tr><td>${escapeHtml(a.date)}</td><td><span class="ld-act-${a.activityTone}">${escapeHtml(a.activity)}</span></td><td>${escapeHtml(a.block)}</td><td class="tc-muted">${escapeHtml(a.notes)}</td></tr>`).join('')}
      </tbody></table></div>
      <div class="ld-agro-side">
        <div class="ld-ov-card"><h3>Assigned Blocks</h3><table class="products-table"><thead><tr><th>Block</th><th>Crop</th><th>Area</th><th>Status</th></tr></thead><tbody>
          ${(ag.blocks || []).map((b) => `<tr><td>${escapeHtml(b.block)}</td><td>${escapeHtml(b.crop)}</td><td>${escapeHtml(b.area)}</td><td>${ixStatus(b.statusTone, b.status)}</td></tr>`).join('')}
        </tbody></table></div>
        <div class="ld-ov-card"><h3>Agronomist Performance (For this farmer)</h3><div class="ld-perf-grid">
          ${(ag.performance || []).map((p) => `<div class="ld-perf-card"><span class="ld-perf-icon">${p.icon}</span><strong>${escapeHtml(p.value)}</strong><span>${escapeHtml(p.label)}</span></div>`).join('')}
        </div></div>
      </div>
    </div>`;
}

function renderBlocksTab(d, blockWs) {
  const blocks = d.blocks || [];
  const active = state.telecaller.blockId || blocks[0]?.id;
  const block = blocks.find((b) => b.id === active) || blocks[0];
  const sub = state.telecaller.blockTab || 'overview';
  const subTabs = ['overview', 'soil', 'visits', 'recommendations', 'follow-ups', 'timeline'];

  const cards = blocks
    .map(
      (b) => `<button type="button" class="ld-block-card ${b.id === active ? 'active' : ''}" data-block-id="${b.id}">
      <div class="ld-block-card-top"><strong>${escapeHtml(b.name)}</strong><span class="ld-crop-tag">${escapeHtml(b.cropName || b.crop)}</span></div>
      <p>${escapeHtml(b.area || b.acre)} · ${escapeHtml(b.varietyName || b.variety || '—')}</p>
      <p>${ixStatus(b.soilTone, b.soilHealth)} · Last visit ${escapeHtml(b.lastVisit)}</p>
      <span class="ld-block-view">View Details</span>
    </button>`
    )
    .join('');

  const topActions = canEdit()
    ? `<div class="ld-block-top-actions">
        <button type="button" class="btn btn-primary btn-sm" id="ld-add-block">+ Add Block</button>
        <button type="button" class="btn btn-secondary btn-sm" id="ld-add-soil">Add Soil Report</button>
        <button type="button" class="btn btn-secondary btn-sm" id="ld-add-visit">Add Visit</button>
        <button type="button" class="btn btn-secondary btn-sm" id="ld-add-rec-block">Add Recommendation</button>
      </div>`
    : '';

  return `${tabHeader('Farm Blocks', 'Manage farm blocks, soil, visits and recommendations.', topActions)}
    <div class="ld-block-cards">${cards}<button type="button" class="ld-block-card ld-block-add" id="ld-add-block-card"><span>+</span><p>Add Block</p><small>Create new block</small></button></div>
    ${block ? `<div class="ld-block-detail">
      <div class="ld-block-detail-head"><h3>${escapeHtml(block.name)} (${escapeHtml(block.cropName)}) — ${escapeHtml(block.area)}</h3>${ixStatus('success', 'Active')}<select class="products-select" id="ld-change-block">${blocks.map((b) => `<option value="${b.id}" ${b.id === active ? 'selected' : ''}>${escapeHtml(b.name)}</option>`).join('')}</select></div>
      <nav class="ld-subtabs">${subTabs.map((t) => `<button type="button" class="ld-subtab ${sub === t ? 'active' : ''}" data-block-tab="${t}">${t.replace('-', ' ').replace(/\b\w/g, (c) => c.toUpperCase())}</button>`).join('')}</nav>
      <div class="ld-block-grid">${renderBlockSubtab(sub, block, blockWs)}</div>
      <button type="button" class="btn btn-secondary btn-block ld-block-timeline-btn">View Block Timeline</button>
    </div>` : ''}`;
}

function renderBlockSubtab(sub, block, ws) {
  if (sub !== 'overview') {
    return `<p class="tc-muted ld-block-placeholder">${escapeHtml(sub)} data — use Overview for full block workspace.</p>`;
  }
  const info = ws?.blockInfo || {};
  const metrics = ws?.soilReport?.metrics || {};
  const metricRows = Object.entries(metrics)
    .slice(0, 6)
    .map(([k, v]) => {
      const row = v;
      const label = k.replace(/([A-Z])/g, ' $1').replace(/^./, (s) => s.toUpperCase());
      const val = typeof row === 'object' ? row.value : row;
      const st = typeof row === 'object' ? row.status : 'Normal';
      return `<tr><td>${label}</td><td>${escapeHtml(String(val))}</td><td>${ixStatus(st === 'Good' ? 'success' : st === 'Low' ? 'warning' : 'info', st)}</td></tr>`;
    })
    .join('');

  const visit = ws?.latestVisit;
  const recs = ws?.recommendations || [];
  const timeline = ws?.timeline || [];

  return `
    <div class="ld-bcol"><h4>Block Information <button type="button" class="ld-ov-link">Edit</button></h4><dl class="ld-ov-dl">${[
      ['Block Name', info.blockName || block.name],
      ['Area', info.area || block.area],
      ['Crop', info.crop || block.cropName],
      ['Variety', info.variety || block.varietyName],
      ['Planting Date', info.plantingDate || '—'],
      ['Days After Planting', info.daysAfterPlanting ?? '—'],
      ['Irrigation', info.irrigationType || 'Drip'],
      ['Spacing', info.spacing || '—'],
    ].map(([k, v]) => `<div><dt>${k}</dt><dd>${escapeHtml(String(v))}</dd></div>`).join('')}</dl>
      <h4 class="ld-mt">Block Progress</h4><p>${escapeHtml(info.growthStage || 'Vegetative')} → <strong>${escapeHtml(info.nextStage || 'Flowering')}</strong></p>
      <div class="ld-progress"><span style="width:${info.growthPercent || block.growthPercent || 65}%"></span></div></div>
    <div class="ld-bcol"><h4>Soil Reports</h4><table class="products-table ld-soil-mini"><tbody>${metricRows || '<tr><td colspan="3">No soil report</td></tr>'}</tbody></table></div>
    <div class="ld-bcol"><h4>Latest Visit</h4><dl class="ld-ov-dl">${visit ? [['Agronomist', visit.agronomistName], ['Disease', visit.diseasePest], ['SPAD', visit.spad || '—'], ['Notes', (visit.observations || '').slice(0, 40)]].map(([k,v]) => `<div><dt>${k}</dt><dd>${escapeHtml(String(v))}</dd></div>`).join('') : '<p class="tc-muted">No visits yet</p>'}</dl></div>
    <div class="ld-bcol"><h4>Current Recommendation</h4>${recs.length ? recs.map((r) => `<p><span class="ld-ix-status ld-ix-status-${r.recType === 'ai' ? 'info' : 'success'}">${escapeHtml(r.recType)}</span> ${escapeHtml(r.recommendation)}</p>`).join('') : '<p class="tc-muted">No active recommendation</p>'}</div>
    <div class="ld-bcol"><h4>Timeline</h4><ul class="ld-ov-timeline">${timeline.map((t) => `<li><strong>${escapeHtml(t.title)}</strong><time>${escapeHtml(t.atLabel)}</time></li>`).join('') || '<li class="tc-muted">No events</li>'}</ul></div>`;
}

export function renderTabBody(tab, data, ffData, blockWs) {
  const d = enrichLeadData(data);
  switch (tab) {
    case 'overview':
      return renderOverviewTab(d);
    case 'interactions':
      return `${renderInteractionsTab(d)}`;
    case 'calls':
      return `<div class="ld-tab-pane">${tabHeader('Calls', 'Inbound and outbound call logs for this farmer.')}<div class="products-table-card"><table class="products-table"><thead><tr><th>Date</th><th>Direction</th><th>Duration</th><th>Outcome</th><th>Agent</th></tr></thead><tbody><tr><td colspan="5" class="empty-state">Calls logged from workspace quick actions appear here.</td></tr></tbody></table></div></div>`;
    case 'whatsapp':
      return `<div class="ld-tab-pane">${tabHeader('WhatsApp', 'Message history with this farmer.')}<p class="tc-muted"><a href="#whatsapp-crm">Open WhatsApp CRM inbox</a> for full conversation thread.</p></div>`;
    case 'orders':
      return renderOrdersTab(d);
    case 'recommendations':
      return renderRecommendationsTab(d);
    case 'field-findings':
      return renderFieldFindingsTab(ffData);
    case 'agronomist':
      return renderAgronomistTab(d);
    case 'purchase-history':
      return renderOrdersTab({ ...d, ordersDetailed: d.ordersDetailed?.slice(0, 3) });
    case 'tasks':
      return `<div class="ld-tab-pane">${tabHeader('Tasks', 'Pending and completed tasks.')}<table class="products-table"><thead><tr><th>Task</th><th>Due</th><th>Status</th></tr></thead><tbody>${(d.tasks || []).map((t) => `<tr><td>${escapeHtml(t.title)}</td><td>${escapeHtml(t.dueLabel)}</td><td>${ixStatus(t.status === 'pending' ? 'warning' : 'success', t.status)}</td></tr>`).join('') || '<tr><td colspan="3" class="empty-state">No tasks</td></tr>'}</tbody></table></div>`;
    case 'follow-ups':
      return `<div class="ld-tab-pane">${tabHeader('Follow-ups', 'Scheduled follow-up activities.')}${d.nextFollowUp ? `<div class="ld-next-card"><strong>${escapeHtml(d.nextFollowUp.title)}</strong><p>${escapeHtml(d.nextFollowUp.dueLabel)}</p></div>` : '<p class="tc-muted">No follow-ups scheduled.</p>'}</div>`;
    case 'blocks':
      return renderBlocksTab(d, blockWs);
    default:
      return '';
  }
}

export async function loadLeadData(leadId, tab) {
  const base = await api(`/console/api/v1/telecaller/leads/${leadId}`);
  let data = { ...base };
  let ffData = null;
  let blockWs = null;

  try {
    const crm = await api(`/console/api/v1/telecaller/leads/${leadId}/crm`);
    data = { ...data, ...crm, blocks: crm.blocks, agronomist: crm.agronomist };
    data.interactions = crm.interactions?.interactions;
    data.recommendations = crm.recommendations?.recommendations;
    data.ordersDetailed = crm.orders?.orders;
  } catch {
    /* demo fallback via enrichLeadData */
  }

  if (tab === 'field-findings') {
    const ffLimit = state.telecaller.ffLimit || 10;
    const ffPage = state.telecaller.ffPage || 1;
    ffData = await api(`/console/api/v1/telecaller/leads/${leadId}/field-findings?limit=${ffLimit}&page=${ffPage}`);
  }

  if (tab === 'blocks') {
    const blocks = data.blocks || [];
    const blockId = state.telecaller.blockId || blocks[0]?.id;
    if (blockId) {
      state.telecaller.blockId = blockId;
      try {
        blockWs = await api(`/console/api/v1/telecaller/leads/${leadId}/blocks/${blockId}/workspace`);
      } catch {
        blockWs = null;
      }
    }
  }

  data = enrichLeadData(data);
  return { data, ffData, blockWs, leadId };
}

export function renderTabsNav(activeTab) {
  return LEAD_TABS.map(
    (t) => `<button type="button" class="ld-tab ${activeTab === t.id ? 'active' : ''}" data-lead-tab="${t.id}">${escapeHtml(t.label)}</button>`
  ).join('');
}

export function bindLeadDetail(leadId, onRefresh, dataRef = {}) {
  document.querySelectorAll('.ld-tab').forEach((btn) => {
    btn.addEventListener('click', () => {
      state.telecaller.leadTab = btn.dataset.leadTab;
      onRefresh(leadId);
    });
  });

  document.querySelectorAll('[data-goto-tab]').forEach((el) => {
    el.addEventListener('click', (e) => {
      e.preventDefault();
      state.telecaller.leadTab = el.dataset.gotoTab;
      onRefresh(leadId);
    });
  });

  document.querySelectorAll('[data-block-id]').forEach((btn) => {
    btn.addEventListener('click', () => {
      state.telecaller.blockId = btn.dataset.blockId;
      state.telecaller.leadTab = 'blocks';
      onRefresh(leadId);
    });
  });

  document.querySelectorAll('[data-block-tab]').forEach((btn) => {
    btn.addEventListener('click', () => {
      state.telecaller.blockTab = btn.dataset.blockTab;
      onRefresh(leadId);
    });
  });

  $('#ld-add-note')?.addEventListener('click', async () => {
    const note = prompt('Add note');
    if (!note?.trim()) return;
    try {
      await api(`/console/api/v1/telecaller/leads/${leadId}/notes`, { method: 'POST', body: JSON.stringify({ note: note.trim() }) });
      showToast('Note saved');
      onRefresh(leadId);
    } catch (err) {
      showToast(err.message, 'error');
    }
  });

  const blocks = dataRef.blocks || [];

  $('#ld-add-finding')?.addEventListener('click', () => {
    showAddFieldFindingModal(leadId, blocks, () => onRefresh(leadId));
  });

  $('#ld-add-interaction')?.addEventListener('click', () => {
    showAddInteractionModal(leadId, blocks, () => onRefresh(leadId));
  });

  $('#ld-add-recommendation')?.addEventListener('click', () => {
    showAddRecommendationModal(leadId, blocks, () => onRefresh(leadId));
  });

  const openAddBlock = () => showAddBlockModal(leadId, () => onRefresh(leadId));
  $('#ld-add-block')?.addEventListener('click', openAddBlock);
  $('#ld-add-block-card')?.addEventListener('click', openAddBlock);

  $('#ld-change-block')?.addEventListener('change', (ev) => {
    state.telecaller.blockId = ev.target.value;
    onRefresh(leadId);
  });

  $('#ld-add-soil')?.addEventListener('click', async () => {
    const blockId = state.telecaller.blockId || blocks[0]?.id;
    try {
      await api(`/console/api/v1/telecaller/leads/${leadId}/soil-reports`, {
        method: 'POST',
        body: JSON.stringify({ blockId }),
      });
      showToast('Soil report saved');
      onRefresh(leadId);
    } catch (err) {
      showToast(err.message, 'error');
    }
  });

  $('#ld-add-visit')?.addEventListener('click', () => {
    showAddFieldFindingModal(leadId, blocks, () => onRefresh(leadId));
  });

  $('#ld-add-rec-block')?.addEventListener('click', () => {
    showAddRecommendationModal(leadId, blocks, () => onRefresh(leadId));
  });

  $('#ld-ff-limit')?.addEventListener('change', () => {
    state.telecaller.ffLimit = Number($('#ld-ff-limit').value);
    state.telecaller.ffPage = 1;
    onRefresh(leadId);
  });

  document.querySelectorAll('[data-ld-page]').forEach((btn) => {
    btn.addEventListener('click', () => {
      state.telecaller.ffPage = Number(btn.dataset.ldPage);
      onRefresh(leadId);
    });
  });

  $('#ld-update-stage')?.addEventListener('click', async () => {
    const stage = $('#ld-quick-stage')?.value;
    if (!stage) return;
    try {
      await api(`/console/api/v1/telecaller/leads/${leadId}`, { method: 'PATCH', body: JSON.stringify({ stage }) });
      showToast('Stage updated');
      onRefresh(leadId);
    } catch (err) {
      showToast(err.message, 'error');
    }
  });
}

export async function renderLeadDetailInto(container, leadId, opts = {}) {
  if (!container) return;
  const tab = state.telecaller.leadTab || 'overview';
  container.innerHTML = '<div class="products-loading"><div class="spinner"></div></div>';
  try {
    const { data, ffData, blockWs } = await loadLeadData(leadId, tab);
    container.innerHTML = `
      <div class="ld-pane ${opts.inPane ? 'ld-pane-embedded' : ''}">
        ${renderLeadHeader(data, { inPane: opts.inPane, compact: opts.inPane })}
        <nav class="ld-tabs" aria-label="Lead sections">${renderTabsNav(tab)}</nav>
        <div class="ld-tab-content">${renderTabBody(tab, data, ffData, blockWs)}</div>
      </div>`;
    bindLeadDetail(leadId, (id) => renderLeadDetailInto(container, id, opts), data);
  } catch (err) {
    container.innerHTML = `<div class="alert alert-error">${escapeHtml(err.message)}</div>`;
  }
}
