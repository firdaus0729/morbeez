import { $, api, state, escapeHtml, formatInrFull, canEdit, showToast } from '../core.js';
import { icon } from '../icons.js';

const STAGE_TONE = {
  new_lead: 'stage-new',
  interested: 'stage-interested',
  follow_up: 'stage-follow',
  recommendation: 'stage-rec',
  order_placed: 'stage-order',
  repeat_customer: 'stage-repeat',
};

function kpiCard(label, value, trend, tone = 'default') {
  const trendHtml =
    trend != null
      ? `<span class="tc-kpi-trend tc-kpi-trend-${tone}">${trend > 0 ? '+' : ''}${trend}%</span>`
      : '';
  return `<div class="tc-kpi-card">
    <span class="tc-kpi-label">${escapeHtml(label)}</span>
    <div class="tc-kpi-row">
      <span class="tc-kpi-value">${escapeHtml(String(value))}</span>
      ${trendHtml}
    </div>
  </div>`;
}

function stageBadge(stage, label) {
  const tone = STAGE_TONE[stage] || 'stage-new';
  return `<span class="tc-stage ${tone}">${escapeHtml(label)}</span>`;
}

function renderDetailTab(id, label, active) {
  return `<button type="button" class="tc-detail-tab ${active ? 'active' : ''}" data-detail-tab="${id}">${escapeHtml(label)}</button>`;
}

function renderOverview(d) {
  const f = d.farmer;
  const fo = d.farmOverview;
  const soil = d.soilReport;
  return `
    <div class="tc-overview-grid">
      <section class="tc-panel">
        <h4 class="tc-panel-title">Farmer Details</h4>
        <dl class="tc-dl">
          <div><dt>Name</dt><dd>${escapeHtml(f.name)}</dd></div>
          <div><dt>Mobile</dt><dd>${escapeHtml(f.phone || '—')}</dd></div>
          <div><dt>Language</dt><dd>${escapeHtml(f.language)}</dd></div>
          <div><dt>Territory</dt><dd>${escapeHtml(f.territory)}</dd></div>
          <div><dt>Crop</dt><dd>${escapeHtml(f.crop)}</dd></div>
          <div><dt>Acreage</dt><dd>${escapeHtml(f.acreage)}</dd></div>
          <div><dt>Farm size</dt><dd>${escapeHtml(f.farmSize)}</dd></div>
          <div><dt>Irrigation</dt><dd>${escapeHtml(f.irrigation)}</dd></div>
        </dl>
      </section>
      <section class="tc-panel">
        <h4 class="tc-panel-title">Farm Overview</h4>
        <div class="tc-mini-stats">
          <div><span class="tc-mini-label">Total Blocks</span><strong>${escapeHtml(String(fo.totalBlocks))}</strong></div>
          <div><span class="tc-mini-label">Total Area</span><strong>${escapeHtml(String(fo.totalArea))}</strong></div>
          <div><span class="tc-mini-label">Primary Crop</span><strong>${escapeHtml(fo.primaryCrop)}</strong></div>
          <div><span class="tc-mini-label">Soil Type</span><strong>${escapeHtml(fo.soilType)}</strong></div>
        </div>
        <h4 class="tc-panel-title tc-mt">Latest Soil Report</h4>
        <dl class="tc-dl">
          <div><dt>Report ID</dt><dd>${escapeHtml(soil.reportId)}</dd></div>
          <div><dt>Date</dt><dd>${escapeHtml(soil.date)}</dd></div>
          <div><dt>Soil Health</dt><dd>${escapeHtml(soil.health)}</dd></div>
          <div><dt>pH Value</dt><dd>${escapeHtml(soil.ph)}</dd></div>
        </dl>
      </section>
    </div>`;
}

function renderTimeline(items) {
  if (!items?.length) {
    return '<p class="tc-muted">No interactions yet.</p>';
  }
  return `<ul class="tc-timeline">${items
    .map(
      (t) => `
    <li class="tc-timeline-item">
      <span class="tc-timeline-dot"></span>
      <div>
        <strong>${escapeHtml(t.title)}</strong>
        ${t.detail ? `<p>${escapeHtml(t.detail)}</p>` : ''}
        <time>${escapeHtml(t.atLabel)}</time>
      </div>
    </li>`
    )
    .join('')}</ul>`;
}

function renderLeadDetail(d) {
  const l = d.lead;
  const tab = state.telecaller.detailTab;
  const tabs = [
    ['overview', 'Overview'],
    ['interactions', 'Interactions'],
    ['orders', 'Orders'],
    ['tasks', 'Tasks'],
  ];

  let tabBody = '';
  if (tab === 'overview') tabBody = renderOverview(d);
  else if (tab === 'interactions') tabBody = renderTimeline(d.timeline);
  else if (tab === 'orders') {
    tabBody =
      d.orders?.length > 0
        ? `<ul class="tc-order-list">${d.orders
            .map(
              (o) =>
                `<li><strong>${escapeHtml(o.label)}</strong> — ${formatInrFull(o.amount)} <span class="tc-muted">${escapeHtml(o.date || '')}</span></li>`
            )
            .join('')}</ul>`
        : '<p class="tc-muted">No orders linked yet.</p>';
  } else if (tab === 'tasks') {
    tabBody =
      d.tasks?.length > 0
        ? `<ul class="tc-task-list">${d.tasks
            .map(
              (t) =>
                `<li class="${t.status === 'done' ? 'done' : ''}"><strong>${escapeHtml(t.title)}</strong><span>${escapeHtml(t.dueLabel || '')}</span></li>`
            )
            .join('')}</ul>`
        : '<p class="tc-muted">No tasks scheduled.</p>';
  }

  const stages = (d.stages || [])
    .map(
      (s) =>
        `<button type="button" class="tc-pipeline-step ${s.active ? 'active' : ''} ${s.done ? 'done' : ''}" data-stage="${s.id}" title="${escapeHtml(s.label)}">
          <span class="tc-pipeline-dot"></span>
          <span class="tc-pipeline-label">${escapeHtml(s.label)}</span>
        </button>`
    )
    .join('');

  const next = d.nextFollowUp;

  return `
    <div class="tc-detail">
      <header class="tc-detail-header">
        <div class="tc-detail-identity">
          <span class="tc-avatar-lg">${escapeHtml(l.farmerInitials)}</span>
          <div>
            <h2>${escapeHtml(l.farmerName)}</h2>
            <div class="tc-detail-badges">
              ${stageBadge(l.stage, l.stageLabel)}
              <span class="tc-status-pill">${l.farmerStatus === 'customer' ? 'Customer' : 'Active'}</span>
              <span class="tc-rating">★ ${Number(l.leadScore).toFixed(1)}</span>
            </div>
            <p class="tc-detail-meta">${escapeHtml(l.phone || '')} · ${escapeHtml([l.district, l.state].filter(Boolean).join(', ') || '—')}</p>
          </div>
        </div>
        <div class="tc-detail-actions">
          ${l.phone ? `<a href="tel:${escapeHtml(l.phone)}" class="btn btn-secondary btn-sm">${icon('phone', 'icon-btn')} Call</a>` : ''}
          ${l.phone ? `<a href="https://wa.me/91${String(l.phone).replace(/\D/g, '').slice(-10)}" target="_blank" rel="noopener" class="btn btn-secondary btn-sm">${icon('whatsapp', 'icon-btn')} WhatsApp</a>` : ''}
          ${canEdit() ? `<button type="button" class="btn btn-secondary btn-sm" id="tc-add-note">Add Note</button>` : ''}
        </div>
      </header>

      <nav class="tc-detail-tabs">${tabs.map(([id, label]) => renderDetailTab(id, label, tab === id)).join('')}</nav>
      <div class="tc-detail-body">${tabBody}</div>

      <div class="tc-detail-bottom">
        <div class="tc-quick-actions">
          <h4>Quick Actions</h4>
          <div class="tc-quick-btns">
            ${canEdit() ? `<button type="button" class="btn btn-secondary btn-sm" data-quick="followup">Schedule Follow-up</button>` : ''}
            ${canEdit() ? `<button type="button" class="btn btn-secondary btn-sm" data-quick="task">Create Task</button>` : ''}
            ${canEdit() ? `<button type="button" class="btn btn-secondary btn-sm" data-quick="call">Log Call</button>` : ''}
          </div>
        </div>
        ${next ? `<div class="tc-next-followup">
          <h4>Next Follow-up</h4>
          <p><strong>${escapeHtml(next.title)}</strong></p>
          <p class="tc-muted">${escapeHtml(next.dueLabel || '')}</p>
          ${next.notes ? `<p>${escapeHtml(next.notes)}</p>` : ''}
          ${canEdit() && next.id ? `<button type="button" class="btn btn-primary btn-sm" id="tc-mark-done" data-task-id="${next.id}">Mark as Done</button>` : ''}
        </div>` : ''}
        <div class="tc-pipeline">
          <h4>Lead Stage</h4>
          <div class="tc-pipeline-track">${stages}</div>
        </div>
      </div>
    </div>`;
}

function openAddLeadModal(onSaved) {
  const root = $('#modal-root');
  if (!root) return;
  root.classList.remove('hidden');
  root.innerHTML = `
    <div class="modal-backdrop" id="tc-lead-form-bg">
      <div class="modal-card modal-card-wide">
        <div class="modal-header">
          <h2>Add Lead</h2>
          <button type="button" class="modal-close" id="tc-lead-close">×</button>
        </div>
        <form id="tc-lead-form" class="modal-body">
          <div id="tc-lead-alert" class="alert alert-error hidden"></div>
          <div class="form-row">
            <div class="field"><label>Name</label><input name="name" class="input" required /></div>
            <div class="field"><label>Mobile *</label><input name="phone" class="input" required placeholder="10-digit" /></div>
          </div>
          <div class="form-row">
            <div class="field"><label>State</label><input name="state" class="input" /></div>
            <div class="field"><label>District</label><input name="district" class="input" /></div>
          </div>
          <div class="field"><label>Notes</label><textarea name="notes" class="input" rows="3"></textarea></div>
          <div class="modal-footer">
            <button type="button" class="btn btn-secondary" id="tc-lead-cancel">Cancel</button>
            <button type="submit" class="btn btn-primary">Add Lead</button>
          </div>
        </form>
      </div>
    </div>`;

  const close = () => {
    root.innerHTML = '';
    root.classList.add('hidden');
  };
  $('#tc-lead-close')?.addEventListener('click', close);
  $('#tc-lead-cancel')?.addEventListener('click', close);
  $('#tc-lead-form-bg')?.addEventListener('click', (e) => {
    if (e.target.id === 'tc-lead-form-bg') close();
  });

  $('#tc-lead-form')?.addEventListener('submit', async (e) => {
    e.preventDefault();
    const fd = new FormData(e.target);
    try {
      const data = await api('/console/api/v1/telecaller/leads', {
        method: 'POST',
        body: JSON.stringify({
          name: fd.get('name'),
          phone: fd.get('phone'),
          state: fd.get('state') || undefined,
          district: fd.get('district') || undefined,
          notes: fd.get('notes') || undefined,
        }),
      });
      close();
      showToast('Lead added');
      state.telecaller.selectedLeadId = data.lead?.id;
      onSaved();
    } catch (err) {
      const alert = $('#tc-lead-alert');
      if (alert) {
        alert.textContent = err.message;
        alert.classList.remove('hidden');
      }
    }
  });
}

async function loadLeadDetail(leadId, container) {
  if (!leadId) {
    container.innerHTML = `<div class="tc-detail-empty">
      <p>Select a lead from the list to view farmer profile, timeline, and follow-ups.</p>
    </div>`;
    return;
  }
  container.innerHTML = '<div class="products-loading"><div class="spinner"></div></div>';
  try {
    const data = await api(`/console/api/v1/telecaller/leads/${leadId}`);
    container.innerHTML = renderLeadDetail(data);
    bindDetailEvents(leadId, container, () => loadLeadDetail(leadId, container));
  } catch (err) {
    container.innerHTML = `<div class="alert alert-error">${escapeHtml(err.message)}</div>`;
  }
}

function bindDetailEvents(leadId, container, reload) {
  container.querySelectorAll('[data-detail-tab]').forEach((btn) => {
    btn.addEventListener('click', () => {
      state.telecaller.detailTab = btn.dataset.detailTab;
      reload();
    });
  });

  container.querySelectorAll('[data-stage]').forEach((btn) => {
    btn.addEventListener('click', async () => {
      if (!canEdit()) return;
      try {
        await api(`/console/api/v1/telecaller/leads/${leadId}`, {
          method: 'PATCH',
          body: JSON.stringify({ stage: btn.dataset.stage }),
        });
        showToast('Stage updated');
        renderTelecallerWorkspace();
      } catch (err) {
        showToast(err.message, 'error');
      }
    });
  });

  $('#tc-add-note')?.addEventListener('click', async () => {
    const note = prompt('Add note');
    if (!note?.trim()) return;
    try {
      await api(`/console/api/v1/telecaller/leads/${leadId}/notes`, {
        method: 'POST',
        body: JSON.stringify({ note: note.trim() }),
      });
      showToast('Note saved');
      reload();
    } catch (err) {
      showToast(err.message, 'error');
    }
  });

  container.querySelectorAll('[data-quick]').forEach((btn) => {
    btn.addEventListener('click', async () => {
      const action = btn.dataset.quick;
      try {
        if (action === 'call') {
          await api(`/console/api/v1/telecaller/leads/${leadId}/calls`, {
            method: 'POST',
            body: JSON.stringify({ outcome: 'completed', notes: 'Logged from workspace' }),
          });
          showToast('Call logged');
        } else if (action === 'followup' || action === 'task') {
          const due = new Date(Date.now() + 2 * 86400000).toISOString();
          await api(`/console/api/v1/telecaller/leads/${leadId}/tasks`, {
            method: 'POST',
            body: JSON.stringify({
              title: action === 'followup' ? 'Follow-up call' : 'CRM task',
              dueAt: due,
            }),
          });
          showToast('Task scheduled');
        }
        reload();
      } catch (err) {
        showToast(err.message, 'error');
      }
    });
  });

  $('#tc-mark-done')?.addEventListener('click', async () => {
    const taskId = $('#tc-mark-done')?.dataset.taskId;
    if (!taskId) return;
    try {
      await api(`/console/api/v1/telecaller/tasks/${taskId}/complete`, { method: 'PATCH' });
      showToast('Task completed');
      reload();
    } catch (err) {
      showToast(err.message, 'error');
    }
  });
}

export function bindTelecallerTopbar() {
  if (!canEdit()) return;
  $('#topbar-actions').innerHTML =
    '<button type="button" class="btn btn-primary btn-sm btn-add-product" id="btn-add-lead">' +
    icon('plus', 'icon-btn') +
    ' Add Lead</button>';
  $('#btn-add-lead')?.addEventListener('click', () => {
    openAddLeadModal(() => renderTelecallerWorkspace());
  });
}

export async function renderTelecallerWorkspace() {
  const el = $('#main-content');
  el.innerHTML = '<div class="products-loading"><div class="spinner"></div></div>';

  try {
    const q = new URLSearchParams({
      scope: state.telecaller.scope,
      stage: state.telecaller.stage,
      page: String(state.telecaller.page),
      limit: '20',
      ...(state.telecaller.search ? { search: state.telecaller.search } : {}),
    });

    const [overviewRes, leadsRes] = await Promise.all([
      api('/console/api/v1/telecaller/overview'),
      api(`/console/api/v1/telecaller/leads?${q}`),
    ]);

    const ov = overviewRes.overview;
    const leads = leadsRes.leads || [];
    const counts = leadsRes.counts || { mine: 0, all: 0 };

    if (!state.telecaller.selectedLeadId && leads[0]) {
      state.telecaller.selectedLeadId = leads[0].id;
    }

    const rows = leads
      .map((l) => {
        const sel = l.id === state.telecaller.selectedLeadId ? 'selected' : '';
        return `<tr class="tc-lead-row ${sel}" data-lead-id="${escapeHtml(l.id)}">
          <td class="tc-col-farmer">
            <span class="tc-avatar-sm">${escapeHtml(l.farmerInitials)}</span>
            <div>
              <strong>${escapeHtml(l.farmerName)}</strong>
              <small>${escapeHtml(l.phone || '')}</small>
            </div>
          </td>
          <td>${stageBadge(l.stage, l.stageLabel)}</td>
          <td class="tc-muted">${escapeHtml(l.lastInteractionLabel || '—')}</td>
          <td>${escapeHtml(l.followUpLabel || '—')}</td>
          <td class="tc-notes-preview">${escapeHtml((l.notes || '—').slice(0, 40))}</td>
          <td><span class="tc-status-pill">${l.farmerStatus === 'customer' ? 'Customer' : 'Active'}</span></td>
          <td class="col-actions">
            ${l.phone ? `<a href="tel:${escapeHtml(l.phone)}" class="action-icon" title="Call">${icon('phone', 'icon-action')}</a>` : ''}
            ${l.phone ? `<a href="https://wa.me/91${String(l.phone).replace(/\D/g, '').slice(-10)}" class="action-icon" title="WhatsApp" target="_blank" rel="noopener">${icon('whatsapp', 'icon-action')}</a>` : ''}
          </td>
        </tr>`;
      })
      .join('');

    el.innerHTML = `
      <div class="telecaller-page">
        <div class="tc-kpi-grid">
          ${kpiCard('Calls Today', ov.callsToday, 12, 'up')}
          ${kpiCard('Pending Follow-ups', ov.pendingFollowUps, 18, 'up')}
          ${kpiCard('Interested Farmers', ov.interestedFarmers, 16, 'up')}
          ${kpiCard('Orders Generated', ov.ordersGenerated, -8, 'down')}
          ${kpiCard('Revenue', formatInrFull(ov.revenue), 22, 'up')}
          ${kpiCard('Conversion Rate', `${ov.conversionRate}%`, 6, 'up')}
        </div>

        <div class="tc-workspace">
          <div class="tc-leads-pane" id="tc-leads-pane">
            <div class="tc-leads-toolbar">
              <div class="tc-scope-tabs">
                <button type="button" class="tc-scope-tab ${state.telecaller.scope === 'mine' ? 'active' : ''}" data-scope="mine">My Leads (${counts.mine})</button>
                <button type="button" class="tc-scope-tab ${state.telecaller.scope === 'all' ? 'active' : ''}" data-scope="all">All Leads (${counts.all})</button>
              </div>
              <div class="tc-leads-filters">
                <select id="tc-stage-filter" class="products-select">
                  <option value="all">All Stages</option>
                  <option value="new_lead" ${state.telecaller.stage === 'new_lead' ? 'selected' : ''}>New Lead</option>
                  <option value="interested" ${state.telecaller.stage === 'interested' ? 'selected' : ''}>Interested</option>
                  <option value="follow_up" ${state.telecaller.stage === 'follow_up' ? 'selected' : ''}>Follow-up</option>
                  <option value="recommendation" ${state.telecaller.stage === 'recommendation' ? 'selected' : ''}>Recommendation</option>
                  <option value="order_placed" ${state.telecaller.stage === 'order_placed' ? 'selected' : ''}>Order Placed</option>
                </select>
                <input type="search" id="tc-lead-search" class="products-search tc-lead-search" placeholder="Search leads…" value="${escapeHtml(state.telecaller.search)}" />
              </div>
            </div>
            <div class="table-wrap tc-leads-table-wrap">
              <table class="products-table tc-leads-table">
                <thead>
                  <tr>
                    <th>Farmer Name</th>
                    <th>Lead Stage</th>
                    <th>Last Interaction</th>
                    <th>Next Follow-up</th>
                    <th>Notes</th>
                    <th>Status</th>
                    <th></th>
                  </tr>
                </thead>
                <tbody>${rows || '<tr><td colspan="7" class="empty-state">No leads — add one to get started</td></tr>'}</tbody>
              </table>
            </div>
          </div>
          <div class="tc-detail-pane" id="tc-detail-pane"></div>
          <aside class="tc-timeline-pane" id="tc-side-timeline">
            <h3 class="tc-side-title">Interaction Timeline</h3>
            <p class="tc-muted">Select a lead to view activity.</p>
          </aside>
        </div>
      </div>`;

    const detailPane = $('#tc-detail-pane');
    await loadLeadDetail(state.telecaller.selectedLeadId, detailPane);

    if (state.telecaller.selectedLeadId) {
      try {
        const d = await api(`/console/api/v1/telecaller/leads/${state.telecaller.selectedLeadId}`);
        const side = $('#tc-side-timeline');
        if (side) {
          side.innerHTML = `
            <h3 class="tc-side-title">Interaction Timeline</h3>
            ${renderTimeline(d.timeline)}
          `;
        }
      } catch {
        /* ignore */
      }
    }

    el.querySelectorAll('.tc-lead-row').forEach((row) => {
      row.addEventListener('click', (ev) => {
        if (ev.target.closest('a')) return;
        state.telecaller.selectedLeadId = row.dataset.leadId;
        renderTelecallerWorkspace();
      });
    });

    el.querySelectorAll('[data-scope]').forEach((btn) => {
      btn.addEventListener('click', () => {
        state.telecaller.scope = btn.dataset.scope;
        state.telecaller.page = 1;
        renderTelecallerWorkspace();
      });
    });

    $('#tc-stage-filter')?.addEventListener('change', () => {
      state.telecaller.stage = $('#tc-stage-filter').value;
      renderTelecallerWorkspace();
    });

    $('#tc-lead-search')?.addEventListener('keydown', (ev) => {
      if (ev.key === 'Enter') {
        state.telecaller.search = $('#tc-lead-search').value.trim();
        renderTelecallerWorkspace();
      }
    });
  } catch (err) {
    el.innerHTML = `<div class="alert alert-error">${escapeHtml(err.message)}</div>`;
  }
}
