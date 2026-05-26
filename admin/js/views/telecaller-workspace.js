import { $, api, state, escapeHtml, formatInrFull, canEdit } from '../core.js';
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

export function bindTelecallerTopbar(onAddLead) {
  if (!canEdit()) return;
  $('#topbar-actions').innerHTML =
    '<button type="button" class="btn btn-primary btn-sm btn-add-product" id="btn-add-lead">' +
    icon('plus', 'icon-btn') +
    ' Add Lead</button>';
  $('#btn-add-lead')?.addEventListener('click', () => {
    openAddLeadModal(onAddLead);
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

    const rows = leads
      .map(
        (l) => `
      <tr class="tc-lead-row" data-lead-id="${escapeHtml(l.id)}">
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
          <button type="button" class="action-icon" title="Open lead" data-open-lead="${escapeHtml(l.id)}">${icon('eye', 'icon-action')}</button>
          ${l.phone ? `<a href="tel:${escapeHtml(l.phone)}" class="action-icon" title="Call" onclick="event.stopPropagation()">${icon('phone', 'icon-action')}</a>` : ''}
        </td>
      </tr>`
      )
      .join('');

    el.innerHTML = `
      <div class="telecaller-page telecaller-list-page">
        <div class="tc-kpi-grid">
          ${kpiCard('Calls Today', ov.callsToday, 12, 'up')}
          ${kpiCard('Pending Follow-ups', ov.pendingFollowUps, 18, 'up')}
          ${kpiCard('Interested Farmers', ov.interestedFarmers, 16, 'up')}
          ${kpiCard('Orders Generated', ov.ordersGenerated, -8, 'down')}
          ${kpiCard('Revenue', formatInrFull(ov.revenue), 22, 'up')}
          ${kpiCard('Conversion Rate', `${ov.conversionRate}%`, 6, 'up')}
        </div>

        <div class="products-table-card tc-leads-card">
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
          <div class="table-wrap">
            <table class="products-table tc-leads-table">
              <thead>
                <tr>
                  <th>Farmer Name</th>
                  <th>Lead Stage</th>
                  <th>Last Interaction</th>
                  <th>Next Follow-up</th>
                  <th>Notes</th>
                  <th>Status</th>
                  <th class="col-actions-h">Action</th>
                </tr>
              </thead>
              <tbody>${rows || '<tr><td colspan="7" class="empty-state">No leads — add one to get started</td></tr>'}</tbody>
            </table>
          </div>
        </div>
      </div>`;

    const openLead = (id) => {
      state.telecaller.selectedLeadId = id;
      location.hash = `telecaller/lead/${id}`;
    };

    el.querySelectorAll('.tc-lead-row').forEach((row) => {
      row.addEventListener('click', (ev) => {
        if (ev.target.closest('a')) return;
        openLead(row.dataset.leadId);
      });
    });

    el.querySelectorAll('[data-open-lead]').forEach((btn) => {
      btn.addEventListener('click', (ev) => {
        ev.stopPropagation();
        openLead(btn.dataset.openLead);
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
