import { $, api, escapeHtml, showToast } from '../core.js';

export async function fetchMasters(type, parentId = null, search = '') {
  const q = new URLSearchParams({ type });
  if (parentId) q.set('parentId', parentId);
  if (search) q.set('search', search);
  const res = await api(`/console/api/v1/crm/masters?${q}`);
  return res.items || [];
}

export async function createMaster(type, name, parentId = null) {
  const item = await api('/console/api/v1/crm/masters', {
    method: 'POST',
    body: JSON.stringify({ masterType: type, name, parentId }),
  });
  return item.item;
}

/** Build <select> with "+ Add new" option */
export function masterSelectHtml(id, type, options, selectedId = '', label = '') {
  const opts = (options || [])
    .map((o) => `<option value="${escapeHtml(o.id)}" ${o.id === selectedId ? 'selected' : ''}>${escapeHtml(o.name)}</option>`)
    .join('');
  return `<label class="field-label">${escapeHtml(label)}</label>
    <select id="${id}" class="products-select crm-master-select" data-master-type="${escapeHtml(type)}">
      <option value="">— Select —</option>${opts}<option value="__new__">+ Add new…</option>
    </select>`;
}

export function bindMasterSelects(root, onChange) {
  root?.querySelectorAll('.crm-master-select').forEach((sel) => {
    sel.addEventListener('change', async () => {
      if (sel.value !== '__new__') {
        onChange?.(sel);
        return;
      }
      const type = sel.dataset.masterType;
      const name = prompt(`Add new ${type.replace(/_/g, ' ')}`);
      if (!name?.trim()) {
        sel.value = '';
        return;
      }
      try {
        const item = await createMaster(type, name.trim());
        const opt = document.createElement('option');
        opt.value = item.id;
        opt.textContent = item.name;
        sel.insertBefore(opt, sel.querySelector('option[value="__new__"]'));
        sel.value = item.id;
        showToast('Saved to master list');
        onChange?.(sel);
      } catch (err) {
        showToast(err.message, 'error');
        sel.value = '';
      }
    });
  });
}

export function openModal(title, bodyHtml, onSubmit) {
  const root = document.getElementById('modal-root');
  if (!root) return;
  root.classList.remove('hidden');
  root.innerHTML = `
    <div class="modal-backdrop" id="crm-modal-backdrop">
      <div class="modal-card crm-modal-card" role="dialog">
        <header class="modal-head"><h2>${escapeHtml(title)}</h2>
          <button type="button" class="modal-close" id="crm-modal-close" aria-label="Close">×</button>
        </header>
        <div class="modal-body">${bodyHtml}</div>
        <footer class="modal-foot">
          <button type="button" class="btn btn-secondary" id="crm-modal-cancel">Cancel</button>
          <button type="button" class="btn btn-primary" id="crm-modal-save">Save</button>
        </footer>
      </div>
    </div>`;

  const close = () => {
    root.classList.add('hidden');
    root.innerHTML = '';
  };
  $('#crm-modal-close')?.addEventListener('click', close);
  $('#crm-modal-cancel')?.addEventListener('click', close);
  $('#crm-modal-backdrop')?.addEventListener('click', (e) => {
    if (e.target.id === 'crm-modal-backdrop') close();
  });
  $('#crm-modal-save')?.addEventListener('click', async () => {
    try {
      await onSubmit(close);
    } catch (err) {
      showToast(err.message, 'error');
    }
  });
}

export async function showAddBlockModal(leadId, onDone) {
  const crops = await fetchMasters('crop');
  const irrigation = await fetchMasters('irrigation_type');
  const soil = await fetchMasters('soil_type');

  openModal(
    'Add Block',
    `<div class="crm-form-grid">
      <div class="field"><label>Block Name</label><input id="crm-b-name" class="input" placeholder="Block A" /></div>
      <div class="field"><label>Area</label><input id="crm-b-area" class="input" placeholder="2.1 Acre" /></div>
      ${masterSelectHtml('crm-b-crop', 'crop', crops, '', 'Crop')}
      <div class="field"><label>Variety</label><input id="crm-b-variety" class="input" placeholder="Nendran" /></div>
      ${masterSelectHtml('crm-b-irr', 'irrigation_type', irrigation, '', 'Irrigation')}
      ${masterSelectHtml('crm-b-soil', 'soil_type', soil, '', 'Soil Type')}
      <div class="field"><label>Planting Date</label><input id="crm-b-plant" type="date" class="input" /></div>
    </div>`,
    async (close) => {
      const cropSel = $('#crm-b-crop');
      const cropName = cropSel?.selectedOptions?.[0]?.text;
      await api(`/console/api/v1/telecaller/leads/${leadId}/blocks`, {
        method: 'POST',
        body: JSON.stringify({
          name: $('#crm-b-name')?.value?.trim(),
          area: $('#crm-b-area')?.value?.trim(),
          cropId: cropSel?.value && cropSel.value !== '__new__' ? cropSel.value : undefined,
          cropName: cropName && cropName !== '+ Add new…' ? cropName : undefined,
          varietyName: $('#crm-b-variety')?.value?.trim(),
          irrigationTypeId: $('#crm-b-irr')?.value || undefined,
          soilTypeId: $('#crm-b-soil')?.value || undefined,
          plantingDate: $('#crm-b-plant')?.value || undefined,
        }),
      });
      showToast('Block created');
      close();
      onDone?.();
    }
  );
  bindMasterSelects($('.crm-modal-card', document.getElementById('modal-root')));
}

export async function showAddInteractionModal(leadId, blocks, onDone) {
  const types = await fetchMasters('interaction_type');
  const blockOpts = (blocks || [])
    .map((b) => `<option value="${escapeHtml(b.id)}">${escapeHtml(b.name)}</option>`)
    .join('');

  openModal(
    'Add Interaction',
    `<div class="crm-form-grid">
      ${masterSelectHtml('crm-ix-type', 'interaction_type', types, '', 'Interaction Type')}
      <div class="field"><label>Block</label><select id="crm-ix-block" class="products-select"><option value="">—</option>${blockOpts}</select></div>
      <div class="field full"><label>Summary / Notes</label><textarea id="crm-ix-notes" class="input" rows="3"></textarea></div>
      <div class="field"><label>Next follow-up</label><input id="crm-ix-follow" type="datetime-local" class="input" /></div>
    </div>`,
    async (close) => {
      const typeSel = $('#crm-ix-type');
      await api(`/console/api/v1/telecaller/leads/${leadId}/interactions`, {
        method: 'POST',
        body: JSON.stringify({
          interactionType: typeSel?.selectedOptions?.[0]?.text || 'Note',
          blockId: $('#crm-ix-block')?.value || undefined,
          notes: $('#crm-ix-notes')?.value?.trim(),
          nextActionAt: $('#crm-ix-follow')?.value || undefined,
          status: 'completed',
        }),
      });
      showToast('Interaction logged');
      close();
      onDone?.();
    }
  );
  bindMasterSelects($('.crm-modal-card', document.getElementById('modal-root')));
}

export async function showAddRecommendationModal(leadId, blocks, onDone) {
  const methods = await fetchMasters('application_method');
  const blockOpts = (blocks || [])
    .map((b) => `<option value="${escapeHtml(b.id)}">${escapeHtml(b.name)}</option>`)
    .join('');

  openModal(
    'Add Recommendation',
    `<div class="crm-form-grid">
      <div class="field"><label>Block</label><select id="crm-rec-block" class="products-select"><option value="">—</option>${blockOpts}</select></div>
      <div class="field full"><label>Problem / Need</label><input id="crm-rec-problem" class="input" /></div>
      <div class="field full"><label>Recommendation</label><textarea id="crm-rec-text" class="input" rows="3"></textarea></div>
      <div class="field"><label>Dosage</label><input id="crm-rec-dosage" class="input" /></div>
      ${masterSelectHtml('crm-rec-method', 'application_method', methods, '', 'Application Method')}
      <div class="field"><label>Follow-up date</label><input id="crm-rec-follow" type="datetime-local" class="input" /></div>
    </div>`,
    async (close) => {
      await api(`/console/api/v1/telecaller/leads/${leadId}/recommendations`, {
        method: 'POST',
        body: JSON.stringify({
          blockId: $('#crm-rec-block')?.value || undefined,
          problem: $('#crm-rec-problem')?.value?.trim(),
          recommendation: $('#crm-rec-text')?.value?.trim(),
          dosage: $('#crm-rec-dosage')?.value?.trim(),
          applicationMethod: $('#crm-rec-method')?.selectedOptions?.[0]?.text,
          followUpAt: $('#crm-rec-follow')?.value || undefined,
          recType: 'agronomist',
        }),
      });
      showToast('Recommendation added');
      close();
      onDone?.();
    }
  );
  bindMasterSelects($('.crm-modal-card', document.getElementById('modal-root')));
}

export async function showAddFieldFindingModal(leadId, blocks, onDone) {
  const diseases = await fetchMasters('disease');
  const blockOpts = (blocks || [])
    .map((b) => `<option value="${escapeHtml(b.id)}" data-name="${escapeHtml(b.name)}" data-crop="${escapeHtml(b.cropName)}">${escapeHtml(b.name)} — ${escapeHtml(b.cropName)}</option>`)
    .join('');

  openModal(
    'Add Field Finding',
    `<div class="crm-form-grid">
      <div class="field"><label>Block</label><select id="crm-ff-block" class="products-select">${blockOpts}</select></div>
      ${masterSelectHtml('crm-ff-disease', 'disease', diseases, '', 'Disease / Pest')}
      <div class="field"><label>SPAD</label><input id="crm-ff-spad" class="input" type="number" /></div>
      <div class="field"><label>Soil Moisture %</label><input id="crm-ff-moist" class="input" /></div>
      <div class="field full"><label>Observations</label><textarea id="crm-ff-obs" class="input" rows="3"></textarea></div>
    </div>`,
    async (close) => {
      const blockSel = $('#crm-ff-block');
      const opt = blockSel?.selectedOptions?.[0];
      const disease = $('#crm-ff-disease')?.selectedOptions?.[0]?.text;
      await api(`/console/api/v1/telecaller/leads/${leadId}/field-findings`, {
        method: 'POST',
        body: JSON.stringify({
          blockId: blockSel?.value,
          blockName: opt?.dataset.name || 'Block A',
          cropType: opt?.dataset.crop || '—',
          diseasePest: disease,
          diseaseTone: disease === 'Healthy' ? 'healthy' : 'warning',
          observations: $('#crm-ff-obs')?.value?.trim(),
          parameters: [
            { label: 'SPAD', value: String($('#crm-ff-spad')?.value || '—') },
            { label: 'Soil Moisture', value: `${$('#crm-ff-moist')?.value || '—'}%` },
          ],
        }),
      });
      showToast('Field finding saved');
      close();
      onDone?.();
    }
  );
  bindMasterSelects($('.crm-modal-card', document.getElementById('modal-root')));
}
