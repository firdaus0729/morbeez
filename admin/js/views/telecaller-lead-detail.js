import { $, api, state, escapeHtml, formatInrFull, canEdit, showToast, initials } from '../core.js';
import { icon } from '../icons.js';
import { openAddLeadModal } from './telecaller-shared.js';

const STAGE_TONE = {
  new_lead: 'stage-new',
  interested: 'stage-interested',
  follow_up: 'stage-follow',
  recommendation: 'stage-rec',
  order_placed: 'stage-order',
  repeat_customer: 'stage-repeat',
};

const LEAD_TABS = [
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

function stageBadge(stage, label) {
  const tone = STAGE_TONE[stage] || 'stage-new';
  return `<span class="tc-stage ${tone}">${escapeHtml(label)}</span>`;
}

function statusPill(active) {
  return `<span class="ld-status-pill ${active ? 'ld-status-active' : ''}">${active ? 'Active' : 'Inactive'}</span>`;
}

function diseaseTag(tone, label) {
  return `<span class="ld-disease ld-disease-${tone}">${escapeHtml(label)}</span>`;
}

function renderParams(params) {
  if (!params?.length) return '—';
  return `<ul class="ld-params">${params.map((p) => `<li><span>${escapeHtml(p.label)}</span> ${escapeHtml(p.value)}</li>`).join('')}</ul>`;
}

function renderPhotoThumbs(count) {
  const n = Math.min(count, 4);
  const extra = count > 4 ? count - 4 : 0;
  let html = '<div class="ld-photo-thumbs">';
  for (let i = 0; i < n; i++) {
    html += `<span class="ld-photo-thumb" aria-hidden="true"></span>`;
  }
  if (extra > 0) html += `<span class="ld-photo-more">+${extra}</span>`;
  html += '</div>';
  return html;
}

function renderFieldFindingsTable(findings, pg) {
  const rows = findings
    .map(
      (f) => `
    <tr>
      <td class="ld-col-datetime">${escapeHtml(f.visitedLabel || '—')}</td>
      <td><strong>${escapeHtml(f.blockName)}</strong><br><span class="tc-muted">${escapeHtml(f.cropType)}</span></td>
      <td class="ld-col-agronomist">
        <div class="ld-agronomist-cell">
          <span class="tc-avatar-sm">${escapeHtml(f.agronomistInitials)}</span>
          <div><strong>${escapeHtml(f.agronomistName)}</strong><br><small>${escapeHtml(f.agronomistRole)}</small></div>
        </div>
      </td>
      <td class="ld-col-obs">${escapeHtml(f.observations || '—')}</td>
      <td class="ld-col-params">${renderParams(f.parameters)}</td>
      <td>${diseaseTag(f.diseaseTone, f.diseasePest)}</td>
      <td class="ld-col-action">${escapeHtml(f.actionTaken || '—')}</td>
      <td class="tc-muted">${escapeHtml(f.followUpLabel || '—')}</td>
      <td>${renderPhotoThumbs(f.photoCount || 0)}</td>
      <td class="col-actions">
        <button type="button" class="action-icon" title="View">${icon('eye', 'icon-action')}</button>
        <button type="button" class="action-icon ld-more-btn" title="More">⋮</button>
      </td>
    </tr>`
    )
    .join('');

  const from = pg.total === 0 ? 0 : (pg.page - 1) * pg.limit + 1;
  const to = Math.min(pg.page * pg.limit, pg.total);
  const pages = pg.pages || 1;
  const pageNums = Array.from({ length: Math.min(pages, 5) }, (_, i) => i + 1);
  const paginationHtml =
    pages > 1
      ? `<div class="products-pagination ld-pagination">${pageNums
          .map(
            (n) =>
              `<button type="button" class="products-page-btn ${n === pg.page ? 'active' : ''}" data-ff-page="${n}">${n}</button>`
          )
          .join('')}${pages > 5 ? `<span class="tc-muted">…</span><button type="button" class="products-page-btn" data-ff-page="${pages}">${pages}</button>` : ''}</div>`
      : '';

  return `
    <div class="ld-tab-section">
      <div class="ld-tab-header">
        <div>
          <h2>Field Findings</h2>
          <p class="ld-tab-desc">All field observations and visit findings recorded by agronomists.</p>
        </div>
        <div class="ld-tab-actions">
          <button type="button" class="btn btn-secondary btn-sm">Filter</button>
          <button type="button" class="btn btn-secondary btn-sm">Export</button>
          ${canEdit() ? '<button type="button" class="btn btn-primary btn-sm" id="ld-add-finding">+ Add Field Finding</button>' : ''}
        </div>
      </div>
      <div class="products-table-card ld-findings-card">
        <div class="table-wrap">
          <table class="products-table ld-findings-table">
            <thead>
              <tr>
                <th>Date &amp; Time</th>
                <th>Block / Crop</th>
                <th>Agronomist</th>
                <th>Observations</th>
                <th>Parameters</th>
                <th>Disease / Pest</th>
                <th>Action Taken</th>
                <th>Next Follow-up</th>
                <th>Photos</th>
                <th class="col-actions-h">Actions</th>
              </tr>
            </thead>
            <tbody>${rows || '<tr><td colspan="10" class="empty-state">No field findings</td></tr>'}</tbody>
          </table>
        </div>
        <div class="products-table-footer ld-findings-footer">
          <p class="products-showing">Showing <strong>${from}</strong> to <strong>${to}</strong> of <strong>${pg.total}</strong> field findings</p>
          ${paginationHtml}
          <div class="ld-rows-per-page">
            <label>Rows per page</label>
            <select id="ld-ff-limit" class="products-select">
              <option value="10" ${pg.limit === 10 ? 'selected' : ''}>10</option>
              <option value="20" ${pg.limit === 20 ? 'selected' : ''}>20</option>
            </select>
          </div>
        </div>
      </div>
    </div>`;
}

function renderTabBody(tab, data, ffData) {
  const l = data.lead;
  const f = data.farmer;

  switch (tab) {
    case 'overview':
      return `
        <div class="ld-overview-grid">
          <section class="ld-panel">
            <h3>Farmer Details</h3>
            <dl class="ld-dl">${[
              ['Name', f.name],
              ['Mobile', f.phone],
              ['Language', f.language],
              ['Territory', f.territory],
              ['Crop', f.crop],
              ['Acreage', f.acreage],
            ]
              .map(([k, v]) => `<div><dt>${k}</dt><dd>${escapeHtml(v || '—')}</dd></div>`)
              .join('')}</dl>
          </section>
          <section class="ld-panel">
            <h3>Farm Overview</h3>
            <div class="ld-mini-grid">
              <div><span>Total Blocks</span><strong>${data.farmOverview.totalBlocks}</strong></div>
              <div><span>Total Area</span><strong>${escapeHtml(String(data.farmOverview.totalArea))}</strong></div>
              <div><span>Primary Crop</span><strong>${escapeHtml(data.farmOverview.primaryCrop)}</strong></div>
              <div><span>Soil Type</span><strong>${escapeHtml(data.farmOverview.soilType)}</strong></div>
            </div>
          </section>
        </div>`;
    case 'interactions':
      return `<div class="ld-tab-section"><h2>Interactions</h2>${renderTimeline(data.timeline)}</div>`;
    case 'calls':
      return `<div class="ld-tab-section"><h2>Calls</h2><p class="tc-muted">Call history is available on the Calls page and logged from quick actions.</p></div>`;
    case 'whatsapp':
      return `<div class="ld-tab-section"><h2>WhatsApp</h2><p class="tc-muted"><a href="#whatsapp-crm">Open WhatsApp CRM inbox</a> for full conversation.</p></div>`;
    case 'orders':
      return `<div class="ld-tab-section"><h2>Orders</h2>${
        data.orders?.length
          ? `<table class="products-table"><thead><tr><th>Order</th><th>Amount</th><th>Date</th></tr></thead><tbody>${data.orders
              .map(
                (o) =>
                  `<tr><td>${escapeHtml(o.label)}</td><td>${formatInrFull(o.amount)}</td><td>${escapeHtml(o.date || '')}</td></tr>`
              )
              .join('')}</tbody></table>`
          : '<p class="tc-muted">No orders linked.</p>'
      }</div>`;
    case 'recommendations':
      return `<div class="ld-tab-section"><h2>Recommendations</h2><p class="tc-muted">Product recommendations from AI advisory and telecaller notes will appear here.</p></div>`;
    case 'field-findings':
      return renderFieldFindingsTable(ffData?.findings || [], ffData?.pagination || { page: 1, limit: 10, total: 0 });
    case 'agronomist':
      return `<div class="ld-tab-section"><h2>Agronomist</h2><p class="tc-muted">Assigned agronomist visits and escalation — connect field team in M3.</p></div>`;
    case 'purchase-history':
      return `<div class="ld-tab-section"><h2>Purchase History</h2>${
        data.orders?.length
          ? data.orders
              .map((o) => `<p><strong>${escapeHtml(o.label)}</strong> — ${formatInrFull(o.amount)}</p>`)
              .join('')
          : '<p class="tc-muted">No purchases yet.</p>'
      }</div>`;
    case 'tasks':
      return `<div class="ld-tab-section"><h2>Tasks</h2><ul class="ld-task-list">${(data.tasks || [])
        .map((t) => `<li><strong>${escapeHtml(t.title)}</strong> — ${escapeHtml(t.dueLabel || '')} <em>(${t.status})</em></li>`)
        .join('') || '<li class="tc-muted">No tasks</li>'}</ul></div>`;
    case 'follow-ups':
      return `<div class="ld-tab-section"><h2>Follow-ups</h2>${
        data.nextFollowUp
          ? `<div class="ld-next-card"><strong>${escapeHtml(data.nextFollowUp.title)}</strong><p>${escapeHtml(data.nextFollowUp.dueLabel || '')}</p></div>`
          : '<p class="tc-muted">No follow-up scheduled.</p>'
      }</div>`;
    case 'blocks':
      return `<div class="ld-tab-section"><h2>Blocks</h2><p class="tc-muted">Farm blocks: Block A, Block B — map integration planned.</p></div>`;
    default:
      return '';
  }
}

function renderTimeline(items) {
  if (!items?.length) return '<p class="tc-muted">No interactions yet.</p>';
  return `<ul class="ld-timeline">${items
    .map(
      (t) => `<li><strong>${escapeHtml(t.title)}</strong>${t.detail ? `<p>${escapeHtml(t.detail)}</p>` : ''}<time>${escapeHtml(t.atLabel)}</time></li>`
    )
    .join('')}</ul>`;
}

function renderLeadHeader(d) {
  const l = d.lead;
  const f = d.farmer;
  const phone = l.phone || '';
  const wa = phone ? `https://wa.me/91${String(phone).replace(/\D/g, '').slice(-10)}` : '#';

  return `
    <a href="#telecaller" class="ld-back">${icon('arrowLeft', 'icon-back')} Back to Leads</a>
    <header class="ld-profile-header">
      <div class="ld-profile-main">
        <span class="ld-avatar-xl">${escapeHtml(l.farmerInitials)}</span>
        <div>
          <div class="ld-name-row">
            <h1>${escapeHtml(l.farmerName)}</h1>
            ${stageBadge(l.stage, l.stageLabel)}
            ${statusPill(l.farmerStatus !== 'customer')}
            <span class="ld-rating">★ ${Number(l.leadScore).toFixed(1)}</span>
          </div>
          <p class="ld-meta-line">
            ${phone ? `${icon('phone', 'ld-meta-icon')} ${escapeHtml(phone)}` : ''}
            <span class="ld-meta-sep">·</span>
            ${icon('location', 'ld-meta-icon')}
            ${escapeHtml([l.district, l.state].filter(Boolean).join(', ') || f.territory)}
            <span class="ld-meta-sep">·</span>
            Language: ${escapeHtml(f.language)}
          </p>
        </div>
      </div>
      <div class="ld-profile-actions">
        ${phone ? `<a href="tel:${escapeHtml(phone)}" class="btn btn-primary btn-sm">${icon('phone', 'icon-btn')} Call</a>` : ''}
        <a href="${wa}" target="_blank" rel="noopener" class="btn btn-primary btn-sm ld-btn-wa">${icon('whatsapp', 'icon-btn')} WhatsApp</a>
        ${canEdit() ? `<button type="button" class="btn btn-secondary btn-sm" id="ld-add-note">Add Note</button>` : ''}
        <button type="button" class="btn btn-secondary btn-sm ld-more-dropdown">More ▾</button>
      </div>
    </header>`;
}

function bindLeadDetail(leadId, data, ffData) {
  const tab = state.telecaller.leadTab || 'field-findings';

  document.querySelectorAll('.ld-tab').forEach((btn) => {
    btn.addEventListener('click', () => {
      state.telecaller.leadTab = btn.dataset.leadTab;
      renderTelecallerLeadDetail(leadId);
    });
  });

  $('#ld-add-note')?.addEventListener('click', async () => {
    const note = prompt('Add note');
    if (!note?.trim()) return;
    try {
      await api(`/console/api/v1/telecaller/leads/${leadId}/notes`, {
        method: 'POST',
        body: JSON.stringify({ note: note.trim() }),
      });
      showToast('Note saved');
      renderTelecallerLeadDetail(leadId);
    } catch (err) {
      showToast(err.message, 'error');
    }
  });

  $('#ld-add-finding')?.addEventListener('click', async () => {
    const block = prompt('Block name', 'Block A');
    const crop = prompt('Crop', 'Banana');
    if (!block || !crop) return;
    try {
      await api(`/console/api/v1/telecaller/leads/${leadId}/field-findings`, {
        method: 'POST',
        body: JSON.stringify({ blockName: block, cropType: crop }),
      });
      showToast('Field finding added');
      renderTelecallerLeadDetail(leadId);
    } catch (err) {
      showToast(err.message, 'error');
    }
  });

  $('#ld-ff-limit')?.addEventListener('change', () => {
    state.telecaller.ffLimit = Number($('#ld-ff-limit').value);
    state.telecaller.ffPage = 1;
    renderTelecallerLeadDetail(leadId);
  });

  document.querySelectorAll('[data-ff-page]').forEach((btn) => {
    btn.addEventListener('click', () => {
      state.telecaller.ffPage = Number(btn.dataset.ffPage);
      renderTelecallerLeadDetail(leadId);
    });
  });
}

export async function renderTelecallerLeadDetail(leadId) {
  const el = $('#main-content');
  el.innerHTML = '<div class="products-loading"><div class="spinner"></div></div>';

  const tab = state.telecaller.leadTab || 'field-findings';
  const ffLimit = state.telecaller.ffLimit || 10;
  const ffPage = state.telecaller.ffPage || 1;

  try {
    const data = await api(`/console/api/v1/telecaller/leads/${leadId}`);
    let ffData = { findings: [], pagination: { page: 1, limit: ffLimit, total: 0, pages: 1 } };
    if (tab === 'field-findings') {
      ffData = await api(
        `/console/api/v1/telecaller/leads/${leadId}/field-findings?limit=${ffLimit}&page=${ffPage}`
      );
    }

    const tabsHtml = LEAD_TABS.map(
      (t) =>
        `<button type="button" class="ld-tab ${tab === t.id ? 'active' : ''}" data-lead-tab="${t.id}">${escapeHtml(t.label)}</button>`
    ).join('');

    el.innerHTML = `
      <div class="lead-detail-page">
        ${renderLeadHeader(data)}
        <nav class="ld-tabs" aria-label="Lead sections">${tabsHtml}</nav>
        <div class="ld-tab-content" id="ld-tab-content">${renderTabBody(tab, data, ffData)}</div>
      </div>`;

    bindLeadDetail(leadId, data, ffData);
  } catch (err) {
    el.innerHTML = `
      <a href="#telecaller" class="ld-back">${icon('arrowLeft', 'icon-back')} Back to Leads</a>
      <div class="alert alert-error">${escapeHtml(err.message)}</div>`;
  }
}

export function bindTelecallerCrmTopbar() {
  const tools = $('.topbar-tools');
  if (tools) {
    tools.innerHTML = `
      <div class="crm-topbar-search" id="crm-topbar-search-wrap">
        ${icon('search', 'icon-search-inline')}
        <input type="search" id="crm-topbar-search" placeholder="Search farmer, mobile, order ID, lead ID…" readonly />
        <kbd class="search-kbd">Ctrl + K</kbd>
      </div>
      <button type="button" class="tool-btn" id="btn-wa-quick" title="WhatsApp CRM">${icon('whatsapp', 'icon-tool')}</button>
      <button type="button" class="tool-btn" id="btn-phone-quick" title="Calls">${icon('phone', 'icon-tool')}</button>
      <button type="button" class="tool-btn tool-btn-bell" id="btn-notify" aria-label="Notifications">
        ${icon('bell', 'icon-tool')}
        <span class="bell-badge">12</span>
      </button>
      <div class="topbar-avatar-wrap">
        <span class="avatar avatar-sm" id="topbar-avatar">A</span>
        <span class="topbar-admin-label" id="topbar-admin-label">Admin</span>
      </div>`;
  }

  $('#crm-topbar-search-wrap')?.addEventListener('click', () => {
    document.getElementById('btn-search')?.click();
  });

  $('#btn-wa-quick')?.addEventListener('click', () => {
    location.hash = 'whatsapp-crm';
  });
  $('#btn-phone-quick')?.addEventListener('click', () => {
    location.hash = 'telecaller/calls';
  });

  const admin = state.admin;
  if (admin) {
    const name = admin.fullName || admin.email?.split('@')[0] || 'Admin';
    const ini = initials(name);
    const av = $('#topbar-avatar');
    if (av) av.textContent = ini;
    const lbl = $('#topbar-admin-label');
    if (lbl) lbl.textContent = name.split(' ')[0];
  }

  const actions = $('#topbar-actions');
  if (actions && canEdit()) {
    actions.innerHTML =
      '<button type="button" class="btn btn-primary btn-sm" id="btn-add-lead">' +
      icon('plus', 'icon-btn') +
      ' Add Lead</button>';
    $('#btn-add-lead')?.addEventListener('click', () => {
      openAddLeadModal(() => {
        location.hash = 'telecaller';
      });
    });
  }
}
