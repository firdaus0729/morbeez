import { $, api, escapeHtml, canEdit, showToast } from '../core.js';

const STATUS_OPTIONS = [
  { value: 'pending', label: 'Pending' },
  { value: 'assigned', label: 'Assigned' },
  { value: 'in_review', label: 'In review' },
  { value: 'resolved', label: 'Resolved' },
  { value: 'closed', label: 'Closed' },
  { value: 'all', label: 'All' },
];

function priorityClass(p) {
  if (p === 'urgent') return 'badge-danger';
  if (p === 'high') return 'badge-warning';
  return 'badge-muted';
}

let selectedId = null;

async function loadList(status) {
  const data = await api(`/console/api/v1/escalations?status=${encodeURIComponent(status)}&limit=50`);
  return data.items || [];
}

async function loadDetail(id) {
  const data = await api(`/console/api/v1/escalations/${id}`);
  return data.escalation;
}

function renderDetail(esc) {
  const session = esc.session || {};
  const recs = esc.productRecommendations || [];
  return `
    <div class="esc-detail">
      <div class="esc-detail-head">
        <div>
          <h3>${escapeHtml(esc.farmer?.name || 'Farmer')}</h3>
          <p class="tc-muted">${escapeHtml(esc.farmer?.phone || '')} · ${escapeHtml(esc.farmer?.district || '')}</p>
        </div>
        <span class="badge ${priorityClass(esc.priority)}">${escapeHtml(esc.priority)}</span>
      </div>
      <dl class="ld-ov-dl esc-meta">
        <div><dt>Status</dt><dd>${escapeHtml(esc.status)}</dd></div>
        <div><dt>Confidence</dt><dd>${esc.confidence != null ? `${Math.round(Number(esc.confidence) * 100)}%` : '—'}</dd></div>
        <div><dt>Crop</dt><dd>${escapeHtml(session.cropType || '—')} ${session.cropStage ? `(${escapeHtml(session.cropStage)})` : ''}</dd></div>
        <div><dt>Created</dt><dd>${escapeHtml(esc.createdLabel || '')}</dd></div>
      </dl>
      <section class="esc-section">
        <h4>Escalation reason</h4>
        <p>${escapeHtml(esc.reason || '')}</p>
      </section>
      ${
        session.symptomsText
          ? `<section class="esc-section"><h4>Symptoms</h4><p>${escapeHtml(session.symptomsText)}</p></section>`
          : ''
      }
      ${
        session.voiceTranscript
          ? `<section class="esc-section"><h4>Voice transcript</h4><p>${escapeHtml(session.voiceTranscript)}</p></section>`
          : ''
      }
      ${
        session.summaryEn || session.probableIssue
          ? `<section class="esc-section"><h4>AI summary</h4>
             <p><strong>${escapeHtml(session.probableIssue || '')}</strong></p>
             <p>${escapeHtml(session.summaryEn || session.summaryMl || '')}</p></section>`
          : ''
      }
      ${
        recs.length
          ? `<section class="esc-section"><h4>Product recommendations</h4><ul>${recs
              .map(
                (r) =>
                  `<li>${escapeHtml(r.title)}${r.handle ? ` <small>(${escapeHtml(r.handle)})</small>` : ''}</li>`
              )
              .join('')}</ul></section>`
          : ''
      }
      ${
        canEdit()
          ? `<form id="esc-update-form" class="esc-form">
        <div class="field">
          <label>Status</label>
          <select class="input" name="status" id="esc-status">
            ${STATUS_OPTIONS.filter((s) => s.value !== 'all')
              .map(
                (s) =>
                  `<option value="${s.value}" ${s.value === esc.status ? 'selected' : ''}>${s.label}</option>`
              )
              .join('')}
          </select>
        </div>
        <div class="field">
          <label>Agronomist notes</label>
          <textarea class="input" name="agronomistNotes" rows="4" placeholder="Review notes, corrections…">${escapeHtml(esc.agronomistNotes || '')}</textarea>
        </div>
        <div class="field">
          <label>Resolution</label>
          <textarea class="input" name="resolution" rows="2" placeholder="Final guidance for telecaller">${escapeHtml(esc.resolution || '')}</textarea>
        </div>
        <button type="submit" class="btn btn-primary">Save review</button>
      </form>`
          : ''
      }
    </div>`;
}

export async function renderTelecallerEscalations() {
  const el = $('#main-content');
  const statusFilter = sessionStorage.getItem('esc-filter-status') || 'pending';
  el.innerHTML = '<div class="products-loading"><div class="spinner"></div></div>';

  try {
    const items = await loadList(statusFilter);

    const rows = items
      .map(
        (e) => `
      <tr class="esc-row ${selectedId === e.id ? 'is-selected' : ''}" data-esc-id="${escapeHtml(e.id)}">
        <td><strong>${escapeHtml(e.farmerName)}</strong><br><small>${escapeHtml(e.farmerPhone || '')}</small></td>
        <td>${escapeHtml(e.cropType || '—')}</td>
        <td><span class="badge ${priorityClass(e.priority)}">${escapeHtml(e.priority)}</span></td>
        <td>${e.confidence != null ? `${Math.round(Number(e.confidence) * 100)}%` : '—'}</td>
        <td>${escapeHtml(String(e.reason || '').slice(0, 60))}${String(e.reason || '').length > 60 ? '…' : ''}</td>
        <td>${escapeHtml(e.status)}</td>
        <td>${escapeHtml(e.createdLabel || '')}</td>
      </tr>`
      )
      .join('');

    el.innerHTML = `
      <div class="tc-subpage esc-page">
        <p class="tc-subpage-desc">Review AI crop advisory cases escalated for agronomist approval.</p>
        <div class="esc-toolbar">
          <label class="esc-filter-label">Status
            <select class="input input-sm" id="esc-status-filter">
              ${STATUS_OPTIONS.map(
                (s) =>
                  `<option value="${s.value}" ${s.value === statusFilter ? 'selected' : ''}>${s.label}</option>`
              ).join('')}
            </select>
          </label>
        </div>
        <div class="esc-layout">
          <div class="products-table-card esc-list-card">
            <div class="table-wrap">
              <table class="products-table esc-table">
                <thead>
                  <tr>
                    <th>Farmer</th>
                    <th>Crop</th>
                    <th>Priority</th>
                    <th>Conf.</th>
                    <th>Reason</th>
                    <th>Status</th>
                    <th>Created</th>
                  </tr>
                </thead>
                <tbody>${rows || '<tr><td colspan="7" class="empty-state">No escalations</td></tr>'}</tbody>
              </table>
            </div>
          </div>
          <aside class="esc-detail-panel" id="esc-detail-panel">
            <p class="empty-state tc-muted">Select an escalation to review</p>
          </aside>
        </div>
      </div>`;

    $('#esc-status-filter')?.addEventListener('change', (ev) => {
      sessionStorage.setItem('esc-filter-status', ev.target.value);
      selectedId = null;
      renderTelecallerEscalations();
    });

    el.querySelectorAll('.esc-row').forEach((row) => {
      row.addEventListener('click', async () => {
        selectedId = row.dataset.escId;
        const panel = $('#esc-detail-panel');
        if (!panel) return;
        panel.innerHTML = '<div class="products-loading"><div class="spinner"></div></div>';
        el.querySelectorAll('.esc-row').forEach((r) => r.classList.toggle('is-selected', r.dataset.escId === selectedId));
        try {
          const esc = await loadDetail(selectedId);
          panel.innerHTML = renderDetail(esc);
          $('#esc-update-form')?.addEventListener('submit', async (ev) => {
            ev.preventDefault();
            const form = ev.target;
            try {
              await api(`/console/api/v1/escalations/${selectedId}`, {
                method: 'PATCH',
                body: JSON.stringify({
                  status: form.status.value,
                  agronomistNotes: form.agronomistNotes.value,
                  resolution: form.resolution.value,
                }),
              });
              showToast('Escalation updated');
              renderTelecallerEscalations();
            } catch (err) {
              showToast(err.message, 'error');
            }
          });
        } catch (err) {
          panel.innerHTML = `<div class="alert alert-error">${escapeHtml(err.message)}</div>`;
        }
      });
    });

    if (selectedId) {
      const row = el.querySelector(`[data-esc-id="${selectedId}"]`);
      row?.click();
    }
  } catch (err) {
    el.innerHTML = `<div class="alert alert-error">${escapeHtml(err.message)}</div>`;
  }
}
