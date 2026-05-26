import { $ } from '../core.js';
import { renderLeadDetailInto } from './telecaller-lead-tabs.js';

export async function renderTelecallerLeadDetail(leadId) {
  const el = $('#main-content');
  await renderLeadDetailInto(el, leadId, { inPane: false });
}

export { bindTelecallerCrmTopbar, restoreDefaultTopbar, refreshCrmTopbarUser } from './telecaller-crm-topbar.js';
