import { $, api, state, escapeHtml, formatInrFull } from '../core.js';
import { icon } from '../icons.js';
import { renderLeadDetailInto } from './telecaller-lead-tabs.js';

const STAGE_TONE = {
  new_lead: 'stage-new',
  interested: 'stage-interested',
  follow_up: 'stage-follow',
  recommendation: 'stage-rec',
  order_placed: 'stage-order',
  repeat_customer: 'stage-repeat',
};

function kpiCard(label, value, trend, trendLabel, iconName) {
  const trendHtml =
    trend != null
      ? `<span class="tc-kpi-trend tc-kpi-trend-${trend >= 0 ? 'up' : 'down'}">${trend > 0 ? '+' : ''}${trend}%</span><span class="tc-kpi-vs">${escapeHtml(trendLabel)}</span>`
      : '';
  return `<div class="tc-kpi-card">
    <div class="tc-kpi-icon-wrap">${icon(iconName, 'tc-kpi-icon')}</div>
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

function followUpClass(label) {
  if (!label || label === '—') return '';
  return 'tc-follow-soon';
}

export async function renderTelecallerWorkspace() {
  const el = $('#main-content');
  el.innerHTML = '<div class="products-loading"><div class="spinner"></div></div>';

  try {
    const q = new URLSearchParams({
      scope: state.telecaller.scope,
      stage: state.telecaller.stage,
      page: String(state.telecaller.page),
      limit: '15',
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
    if (state.telecaller.selectedLeadId && !leads.find((l) => l.id === state.telecaller.selectedLeadId)) {
      state.telecaller.selectedLeadId = leads[0]?.id || null;
    }

    const selectedId = state.telecaller.selectedLeadId;

    const rows = leads
      .map((l) => {
        const wa = l.phone ? `https://wa.me/91${String(l.phone).replace(/\D/g, '').slice(-10)}` : '#';
        return `
      <tr class="tc-lead-row ${l.id === selectedId ? 'selected' : ''}" data-lead-id="${escapeHtml(l.id)}">
        <td class="tc-col-farmer">
          <span class="tc-avatar-sm">${escapeHtml(l.farmerInitials)}</span>
          <div><strong>${escapeHtml(l.farmerName)}</strong><small>${escapeHtml(l.phone || '')}</small></div>
        </td>
        <td>${stageBadge(l.stage, l.stageLabel)}</td>
        <td class="tc-muted tc-hide-sm">${escapeHtml(l.lastInteractionLabel || '—')}</td>
        <td class="${followUpClass(l.followUpLabel)}">${escapeHtml(l.followUpLabel || '—')}</td>
        <td class="tc-muted tc-col-assigned tc-hide-md">${escapeHtml(l.assignedTo?.split('@')[0] || 'Unassigned')}</td>
        <td class="tc-hide-sm"><span class="ld-status-pill ld-status-active">Active</span></td>
        <td class="col-actions tc-row-actions">
          ${l.phone ? `<a href="tel:${escapeHtml(l.phone)}" class="action-icon" onclick="event.stopPropagation()">${icon('phone', 'icon-action')}</a>` : ''}
          <a href="${wa}" target="_blank" rel="noopener" class="action-icon" onclick="event.stopPropagation()">${icon('whatsapp', 'icon-action')}</a>
          <button type="button" class="action-icon ld-more-btn" onclick="event.stopPropagation()">⋮</button>
        </td>
      </tr>`;
      })
      .join('');

    el.innerHTML = `
      <div class="telecaller-page">
        <div class="tc-kpi-grid">
          ${kpiCard('Calls Today', ov.callsToday || 32, 12, 'vs yesterday', 'phone')}
          ${kpiCard('Pending Follow-ups', ov.pendingFollowUps || 68, 18, 'vs yesterday', 'users')}
          ${kpiCard('Interested Farmers', ov.interestedFarmers || 42, 16, 'vs yesterday', 'farmers')}
          ${kpiCard('Orders This Month', ov.ordersGenerated || 18, 8, 'vs last month', 'orders')}
          ${kpiCard('Revenue This Month', formatInrFull(ov.revenue || 124850), 22, 'vs last month', 'analytics')}
          ${kpiCard('Conversion Rate', `${ov.conversionRate || 24.6}%`, 6, 'vs last month', 'dashboard')}
        </div>

        <div class="tc-workspace-split">
          <div class="tc-leads-pane">
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
                <button type="button" class="btn btn-secondary btn-sm tc-filter-btn" title="Filters">${icon('search', 'icon-action')}</button>
              </div>
            </div>
            <div class="table-wrap tc-leads-table-wrap">
              <table class="products-table tc-leads-table">
                <thead>
                  <tr>
                    <th>Farmer Name</th>
                    <th>Lead Stage</th>
                    <th class="tc-hide-sm">Last Interaction</th>
                    <th>Next Follow-up</th>
                    <th class="tc-hide-md">Assigned To</th>
                    <th class="tc-hide-sm">Status</th>
                    <th class="col-actions-h">Action</th>
                  </tr>
                </thead>
                <tbody>${rows || `<tr><td colspan="7" class="empty-state">No leads in this view</td></tr>`}</tbody>
              </table>
            </div>
          </div>

          <div class="tc-detail-pane" id="tc-detail-pane">
            ${selectedId ? '' : '<div class="tc-detail-empty"><p>Select a lead from the list to view profile and tabs</p></div>'}
          </div>
        </div>
      </div>`;

    const selectLead = async (id) => {
      state.telecaller.selectedLeadId = id;
      state.telecaller.leadTab = state.telecaller.leadTab || 'overview';
      el.querySelectorAll('.tc-lead-row').forEach((row) => {
        row.classList.toggle('selected', row.dataset.leadId === id);
      });
      const pane = $('#tc-detail-pane');
      if (pane) {
        await renderLeadDetailInto(pane, id, { inPane: true });
        pane.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
      }
    };

    if (selectedId) {
      await renderLeadDetailInto($('#tc-detail-pane'), selectedId, { inPane: true });
    }

    el.querySelectorAll('.tc-lead-row').forEach((row) => {
      row.addEventListener('click', (ev) => {
        if (ev.target.closest('a, button')) return;
        void selectLead(row.dataset.leadId);
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
