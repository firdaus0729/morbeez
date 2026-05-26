import { $, state, initials, canEdit, escapeHtml } from '../core.js';
import { icon } from '../icons.js';
import { roleLabel } from '../nav.js';
import { openSearchPalette } from '../search-palette.js';
import { openAddLeadModal } from './telecaller-shared.js';

let defaultTopbarHtml = null;

function fillUserProfile() {
  const admin = state.admin;
  if (!admin) return;
  const name = admin.fullName || admin.email?.split('@')[0] || 'Admin';
  const ini = initials(name);
  const role = roleLabel(admin.role);

  const av = $('#topbar-avatar');
  if (av) av.textContent = ini;
  const nameEl = $('#topbar-admin-name');
  if (nameEl) {
    const display =
      admin.fullName && !admin.fullName.toLowerCase().includes('store')
        ? admin.fullName.split(' ')[0]
        : 'Admin';
    nameEl.textContent = display;
  }
  const roleEl = $('#topbar-admin-role');
  if (roleEl) roleEl.textContent = role;
}

/**
 * CRM header — matches mockup: menu + title | centered search | Add Lead + icons + profile
 */
export function bindTelecallerCrmTopbar(pageTitle = 'Telecaller CRM Workspace') {
  const topbar = $('.topbar');
  if (!topbar) return;

  if (!defaultTopbarHtml) {
    defaultTopbarHtml = topbar.innerHTML;
  }

  topbar.classList.add('crm-topbar-shell');
  topbar.innerHTML = `
    <div class="crm-topbar-left">
      <button type="button" class="btn-menu crm-btn-menu" id="btn-sidebar" aria-label="Open menu">
        <span></span><span></span><span></span>
      </button>
      <h1 class="page-heading crm-topbar-title" id="page-title">${escapeHtml(pageTitle)}</h1>
    </div>
    <div class="crm-topbar-center">
      <div class="crm-topbar-search" id="crm-topbar-search-wrap" role="button" tabindex="0" aria-label="Search">
        <span class="crm-search-icon">${icon('search', 'crm-search-svg')}</span>
        <input type="search" id="crm-topbar-search" placeholder="Search farmer, mobile, order ID, lead ID…" readonly tabindex="-1" aria-hidden="true" />
        <kbd class="crm-search-kbd">Ctrl + K</kbd>
      </div>
    </div>
    <div class="crm-topbar-right">
      ${
        canEdit()
          ? `<button type="button" class="btn btn-primary btn-sm crm-btn-add-lead" id="btn-add-lead">${icon('plus', 'icon-btn')} Add Lead</button>`
          : ''
      }
      <button type="button" class="tool-btn tool-btn-wa" id="btn-wa-quick" title="WhatsApp CRM" aria-label="WhatsApp">${icon('whatsapp', 'icon-tool')}</button>
      <button type="button" class="tool-btn" id="btn-phone-quick" title="Calls" aria-label="Calls">${icon('phone', 'icon-tool')}</button>
      <button type="button" class="tool-btn tool-btn-bell" id="btn-notify-crm" aria-label="Notifications">
        ${icon('bell', 'icon-tool')}
        <span class="bell-badge">12</span>
      </button>
      <button type="button" class="crm-topbar-user" id="crm-topbar-user-btn" aria-label="Account menu">
        <span class="avatar avatar-sm" id="topbar-avatar">A</span>
        <span class="crm-user-text">
          <strong id="topbar-admin-name">Admin</strong>
          <small id="topbar-admin-role">Super Admin</small>
        </span>
        <span class="crm-user-chevron" aria-hidden="true">▾</span>
      </button>
    </div>`;

  fillUserProfile();

  const openSearch = () => openSearchPalette();
  $('#crm-topbar-search-wrap')?.addEventListener('click', openSearch);
  $('#crm-topbar-search-wrap')?.addEventListener('keydown', (e) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      openSearch();
    }
  });

  $('#btn-wa-quick')?.addEventListener('click', () => {
    location.hash = 'whatsapp-crm';
  });
  $('#btn-phone-quick')?.addEventListener('click', () => {
    location.hash = 'telecaller/calls';
  });

  $('#btn-add-lead')?.addEventListener('click', () => {
    openAddLeadModal(() => {
      location.hash = 'telecaller';
    });
  });

  $('#crm-topbar-user-btn')?.addEventListener('click', () => {
    $('#btn-logout')?.classList.toggle('hidden');
    document.getElementById('sidebar-profile-btn')?.click();
  });
}

export function restoreDefaultTopbar() {
  const topbar = $('.topbar');
  if (!topbar || !defaultTopbarHtml) return;
  topbar.classList.remove('crm-topbar-shell');
  topbar.innerHTML = defaultTopbarHtml;
}

export function refreshCrmTopbarUser() {
  if (document.body.classList.contains('route-telecaller') || document.querySelector('.crm-topbar-shell')) {
    fillUserProfile();
  }
}
