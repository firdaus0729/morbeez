import { $, api, escapeHtml } from '../core.js';

export async function renderTelecallerCalls() {
  const el = $('#main-content');
  el.innerHTML = '<div class="products-loading"><div class="spinner"></div></div>';

  try {
    const data = await api('/console/api/v1/telecaller/calls');
    const calls = data.calls || [];

    const rows = calls
      .map(
        (c) => `
      <tr>
        <td><strong>${escapeHtml(c.farmerName)}</strong></td>
        <td>${escapeHtml(c.phone || '—')}</td>
        <td>${escapeHtml(c.outcome || '—')}</td>
        <td>${c.durationSeconds ? `${c.durationSeconds}s` : '—'}</td>
        <td>${escapeHtml(c.agentEmail || '')}</td>
        <td class="tc-muted">${escapeHtml(c.atLabel || '')}</td>
        <td>${escapeHtml(c.notes || '—')}</td>
      </tr>`
      )
      .join('');

    el.innerHTML = `
      <div class="tc-subpage">
        <p class="tc-subpage-desc">Outbound and inbound call history logged by telecallers.</p>
        <div class="products-table-card">
          <div class="table-wrap">
            <table class="products-table">
              <thead>
                <tr>
                  <th>Farmer</th>
                  <th>Mobile</th>
                  <th>Outcome</th>
                  <th>Duration</th>
                  <th>Agent</th>
                  <th>Date</th>
                  <th>Notes</th>
                </tr>
              </thead>
              <tbody>${rows || '<tr><td colspan="7" class="empty-state">No calls logged yet</td></tr>'}</tbody>
            </table>
          </div>
        </div>
      </div>`;
  } catch (err) {
    el.innerHTML = `<div class="alert alert-error">${escapeHtml(err.message)}</div>`;
  }
}
