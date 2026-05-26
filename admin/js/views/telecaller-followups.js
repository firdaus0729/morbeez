import { $, api, state, escapeHtml, canEdit, showToast } from '../core.js';
import { icon } from '../icons.js';

export async function renderTelecallerFollowups() {
  const el = $('#main-content');
  el.innerHTML = '<div class="products-loading"><div class="spinner"></div></div>';

  try {
    const data = await api('/console/api/v1/telecaller/tasks?status=pending');
    const tasks = data.tasks || [];

    const rows = tasks
      .map(
        (t) => `
      <tr>
        <td><strong>${escapeHtml(t.farmerName)}</strong><br><small>${escapeHtml(t.phone || '')}</small></td>
        <td>${escapeHtml(t.title)}</td>
        <td>${escapeHtml(t.dueLabel || '—')}</td>
        <td>${escapeHtml(t.stage || '—')}</td>
        <td class="col-actions">
          ${
            t.leadId
              ? `<a href="#telecaller" class="btn btn-secondary btn-sm" data-open-lead="${escapeHtml(t.leadId)}">Open</a>`
              : ''
          }
          ${
            canEdit()
              ? `<button type="button" class="btn btn-primary btn-sm" data-complete-task="${escapeHtml(t.id)}">Done</button>`
              : ''
          }
        </td>
      </tr>`
      )
      .join('');

    el.innerHTML = `
      <div class="tc-subpage">
        <p class="tc-subpage-desc">Pending follow-ups and scheduled tasks across your lead pipeline.</p>
        <div class="products-table-card">
          <div class="table-wrap">
            <table class="products-table">
              <thead>
                <tr>
                  <th>Farmer</th>
                  <th>Task</th>
                  <th>Due</th>
                  <th>Stage</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>${rows || '<tr><td colspan="5" class="empty-state">No pending follow-ups</td></tr>'}</tbody>
            </table>
          </div>
        </div>
      </div>`;

    el.querySelectorAll('[data-complete-task]').forEach((btn) => {
      btn.addEventListener('click', async () => {
        try {
          await api(`/console/api/v1/telecaller/tasks/${btn.dataset.completeTask}/complete`, {
            method: 'PATCH',
          });
          showToast('Task completed');
          renderTelecallerFollowups();
        } catch (err) {
          showToast(err.message, 'error');
        }
      });
    });

    el.querySelectorAll('[data-open-lead]').forEach((a) => {
      a.addEventListener('click', (ev) => {
        ev.preventDefault();
        state.telecaller.selectedLeadId = a.dataset.openLead;
        location.hash = 'telecaller';
      });
    });
  } catch (err) {
    el.innerHTML = `<div class="alert alert-error">${escapeHtml(err.message)}</div>`;
  }
}
