import { $, api, escapeHtml, formatDate, isAdmin } from '../core.js';

export async function renderStaff() {
  const el = $('#main-content');
  if (!isAdmin()) {
    el.innerHTML = '<div class="alert alert-error">Only administrators can view staff accounts.</div>';
    return;
  }

  el.innerHTML = '<p class="loading">Loading staff…</p>';
  try {
    const data = await api('/console/api/v1/staff');
    const rows = data.staff
      .map(
        (u) => `
      <tr>
        <td><strong>${escapeHtml(u.fullName || u.email)}</strong><br><small class="muted">${escapeHtml(u.email)}</small></td>
        <td><span class="badge badge-role">${escapeHtml(u.role)}</span></td>
        <td><span class="badge badge-${u.active ? 'active' : 'archived'}">${u.active ? 'Active' : 'Inactive'}</span></td>
        <td>${formatDate(u.lastLoginAt)}</td>
        <td>${formatDate(u.createdAt)}</td>
      </tr>`
      )
      .join('');

    el.innerHTML = `
      <div class="panel">
        <div class="panel-header">
          <h3>Staff accounts</h3>
        </div>
        <div class="panel-body" style="border-bottom:1px solid var(--border)">
          <p class="text-sm muted">Create staff via CLI: <code>npm run admin:create-user -- --email you@example.com --password … --role manager</code></p>
        </div>
        <div class="table-wrap">
          <table>
            <thead><tr><th>User</th><th>Role</th><th>Status</th><th>Last login</th><th>Created</th></tr></thead>
            <tbody>${rows || '<tr><td colspan="5" class="empty-state">No staff</td></tr>'}</tbody>
          </table>
        </div>
      </div>`;
  } catch (err) {
    el.innerHTML = `<div class="alert alert-error">${escapeHtml(err.message)}</div>`;
  }
}
