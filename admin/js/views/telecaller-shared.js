import { $, api, escapeHtml, showToast } from '../core.js';

export function openAddLeadModal(onSaved) {
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
      if (data.lead?.id) {
        location.hash = `telecaller/lead/${data.lead.id}`;
      } else {
        onSaved?.();
      }
    } catch (err) {
      const alert = $('#tc-lead-alert');
      if (alert) {
        alert.textContent = err.message;
        alert.classList.remove('hidden');
      }
    }
  });
}
