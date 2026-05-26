import { api, showToast, state } from '../core.js';

export async function openCrmExport(leadId, type = 'lead') {
  try {
    const res = await api(`/console/api/v1/telecaller/leads/${leadId}/export?type=${encodeURIComponent(type)}`);
    const win = window.open('', '_blank');
    if (!win) {
      showToast('Allow pop-ups to export PDF', 'error');
      return;
    }
    win.document.write(res.html);
    win.document.close();
    win.focus();
    setTimeout(() => win.print(), 400);
  } catch (err) {
    showToast(err.message, 'error');
  }
}

export async function openWhatsAppShare(leadId, { type = 'lead', recId } = {}) {
  try {
    const q = new URLSearchParams({ type });
    if (recId) q.set('recId', recId);
    const res = await api(`/console/api/v1/telecaller/leads/${leadId}/share?${q}`);
    if (res.url) {
      window.open(res.url, '_blank', 'noopener');
    } else {
      showToast('No phone number on lead', 'error');
    }
  } catch (err) {
    showToast(err.message, 'error');
  }
}

export async function convertRecommendationToOrder(leadId, recId, onDone) {
  if (!confirm('Create a CRM order from this recommendation?')) return;
  try {
    await api(`/console/api/v1/telecaller/leads/${leadId}/recommendations/${recId}/convert-order`, {
      method: 'POST',
      body: JSON.stringify({}),
    });
    showToast('Order created from recommendation');
    onDone?.();
  } catch (err) {
    showToast(err.message, 'error');
  }
}

export function downloadIcs(icsContent, filename = 'morbeez-visit.ics') {
  const blob = new Blob([icsContent], { type: 'text/calendar;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

export async function scheduleVisitWithCalendar(leadId, payload) {
  const res = await api(`/console/api/v1/telecaller/leads/${leadId}/schedule-visit`, {
    method: 'POST',
    body: JSON.stringify(payload),
  });
  if (res.icsContent) downloadIcs(res.icsContent, res.icsFilename);
  return res;
}

export function rowMenuHtml(items) {
  return `<div class="ld-row-menu-wrap">
    <button type="button" class="action-icon ld-row-menu-btn" aria-label="Actions">⋮</button>
    <div class="ld-row-menu hidden">${items
      .map(
        (it) =>
          `<button type="button" class="ld-row-menu-item" data-crm-action="${it.action}" ${Object.entries(it.data || {})
            .map(([k, v]) => `data-${k}="${String(v).replace(/"/g, '&quot;')}"`)
            .join(' ')}>${it.label}</button>`
      )
      .join('')}</div>
  </div>`;
}

export function bindRowMenus(root, handlers) {
  root?.querySelectorAll('.ld-row-menu-btn').forEach((btn) => {
    btn.addEventListener('click', (e) => {
      e.stopPropagation();
      const wrap = btn.closest('.ld-row-menu-wrap');
      document.querySelectorAll('.ld-row-menu').forEach((m) => {
        if (m !== wrap?.querySelector('.ld-row-menu')) m.classList.add('hidden');
      });
      wrap?.querySelector('.ld-row-menu')?.classList.toggle('hidden');
    });
  });
  root?.querySelectorAll('[data-crm-action]').forEach((el) => {
    el.addEventListener('click', async () => {
      const action = el.dataset.crmAction;
      const handler = handlers[action];
      if (handler) await handler(el);
      el.closest('.ld-row-menu')?.classList.add('hidden');
    });
  });
  document.addEventListener(
    'click',
    () => document.querySelectorAll('.ld-row-menu').forEach((m) => m.classList.add('hidden')),
    { once: true }
  );
}

export function filterChipsHtml(group, field, options, active) {
  return `<div class="ld-filter-chips" data-filter-group="${group}" data-filter-field="${field}">
    ${options
      .map(
        (o) =>
          `<button type="button" class="ld-filter-chip ${active === o.value ? 'active' : ''}" data-filter-val="${o.value}">${o.label}</button>`
      )
      .join('')}
  </div>`;
}

export function bindFilterChips(root, group, onChange) {
  if (!state.telecaller.crmFilters) state.telecaller.crmFilters = {};
  if (!state.telecaller.crmFilters[group]) state.telecaller.crmFilters[group] = {};
  root?.querySelectorAll(`[data-filter-group="${group}"]`).forEach((wrap) => {
    const field = wrap.dataset.filterField;
    wrap.querySelectorAll('[data-filter-val]').forEach((btn) => {
      btn.addEventListener('click', () => {
        const val = btn.dataset.filterVal;
        state.telecaller.crmFilters[group][field] = val === 'all' ? '' : val;
        onChange?.();
      });
    });
  });
}

export function interactionsQuery() {
  const f = state.telecaller.crmFilters?.interactions || {};
  const q = new URLSearchParams();
  if (f.type) q.set('type', f.type);
  if (f.status) q.set('status', f.status);
  if (f.blockId) q.set('blockId', f.blockId);
  return q.toString();
}
