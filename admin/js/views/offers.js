import { $, api, state, escapeHtml, formatInrFull, canEdit, showToast } from '../core.js';
import { icon } from '../icons.js';

const OFFER_TABS = [
  { id: 'all', label: 'All Offers' },
  { id: 'active', label: 'Active' },
  { id: 'upcoming', label: 'Upcoming' },
  { id: 'expired', label: 'Expired' },
];

const OFFER_STATUS_UI = {
  active: { label: 'Active', tone: 'active' },
  upcoming: { label: 'Upcoming', tone: 'upcoming' },
  expired: { label: 'Expired', tone: 'expired' },
};

function renderOfferTabs(tabCounts) {
  return OFFER_TABS.map((tab) => {
    const count = tabCounts?.[tab.id] ?? 0;
    const active = state.offers.tab === tab.id ? 'active' : '';
    return `<button type="button" class="orders-tab ${active}" data-offer-tab="${tab.id}">
      ${escapeHtml(tab.label)}${count ? ` <span class="orders-tab-count">(${count})</span>` : ''}
    </button>`;
  }).join('');
}

function closeModal() {
  const root = $('#modal-root');
  if (root) {
    root.innerHTML = '';
    root.classList.add('hidden');
  }
}

async function showOfferDetail(id) {
  const root = $('#modal-root');
  if (!root) return;
  root.classList.remove('hidden');
  root.innerHTML =
    '<div class="modal-backdrop" id="offer-modal-bg"><div class="modal-card"><div class="products-loading"><div class="spinner"></div></div></div></div>';

  try {
    const data = await api(`/console/api/v1/offers/${id}`);
    const o = data.offer;
    const st = OFFER_STATUS_UI[o.status] || OFFER_STATUS_UI.active;
    root.innerHTML = `
      <div class="modal-backdrop" id="offer-modal-bg">
        <div class="modal-card order-detail-modal" role="dialog">
          <div class="modal-header">
            <h2>${escapeHtml(o.name)}</h2>
            <button type="button" class="modal-close" id="offer-modal-close" aria-label="Close">×</button>
          </div>
          <div class="modal-body">
            <dl class="order-detail-grid">
              <div><dt>Type</dt><dd>${escapeHtml(o.type)}</dd></div>
              <div><dt>Discount</dt><dd>${escapeHtml(o.discount)}</dd></div>
              <div><dt>Min. order</dt><dd>${formatInrFull(o.minOrder)}</dd></div>
              <div><dt>Status</dt><dd><span class="offer-status offer-status-${st.tone}">${escapeHtml(st.label)}</span></dd></div>
              <div class="order-detail-full"><dt>Validity</dt><dd>${escapeHtml(o.validity)}</dd></div>
              ${o.description ? `<div class="order-detail-full"><dt>Description</dt><dd>${escapeHtml(o.description)}</dd></div>` : ''}
            </dl>
          </div>
        </div>
      </div>`;
    $('#offer-modal-close')?.addEventListener('click', closeModal);
    $('#offer-modal-bg')?.addEventListener('click', (ev) => {
      if (ev.target.id === 'offer-modal-bg') closeModal();
    });
  } catch (err) {
    root.innerHTML = `<div class="modal-backdrop"><div class="modal-card"><div class="alert alert-error">${escapeHtml(err.message)}</div></div></div>`;
  }
}

function openCreateOfferModal(onSaved) {
  const root = $('#modal-root');
  if (!root) return;
  root.classList.remove('hidden');
  const today = new Date().toISOString().slice(0, 10);
  const nextMonth = new Date();
  nextMonth.setMonth(nextMonth.getMonth() + 1);

  root.innerHTML = `
    <div class="modal-backdrop" id="create-offer-bg">
      <div class="modal-card modal-card-wide" role="dialog">
        <div class="modal-header">
          <h2>Create offer</h2>
          <button type="button" class="modal-close" id="create-offer-close" aria-label="Close">×</button>
        </div>
        <form id="create-offer-form" class="modal-body">
          <div id="create-offer-alert" class="alert alert-error hidden"></div>
          <div class="form-row">
            <div class="field field-full">
              <label>Offer name</label>
              <input name="name" class="input" required placeholder="Summer Special Offer" />
            </div>
          </div>
          <div class="form-row">
            <div class="field">
              <label>Type</label>
              <select name="offerType" class="input">
                <option value="percentage">Percentage</option>
                <option value="combo">Combo</option>
                <option value="flat">Flat</option>
              </select>
            </div>
            <div class="field">
              <label>Discount label</label>
              <input name="discountLabel" class="input" required placeholder="10% or ₹100 OFF" />
            </div>
          </div>
          <div class="form-row">
            <div class="field">
              <label>Min. order (₹)</label>
              <input name="minOrderAmount" type="number" min="0" class="input" required value="999" />
            </div>
            <div class="field">
              <label>Description</label>
              <input name="description" class="input" placeholder="Optional" />
            </div>
          </div>
          <div class="form-row">
            <div class="field">
              <label>Starts</label>
              <input name="startsAt" type="date" class="input" required value="${today}" />
            </div>
            <div class="field">
              <label>Ends</label>
              <input name="endsAt" type="date" class="input" required value="${nextMonth.toISOString().slice(0, 10)}" />
            </div>
          </div>
          <div class="modal-footer">
            <button type="button" class="btn btn-secondary" id="create-offer-cancel">Cancel</button>
            <button type="submit" class="btn btn-primary">Save offer</button>
          </div>
        </form>
      </div>
    </div>`;

  const close = () => closeModal();
  $('#create-offer-close')?.addEventListener('click', close);
  $('#create-offer-cancel')?.addEventListener('click', close);
  $('#create-offer-bg')?.addEventListener('click', (ev) => {
    if (ev.target.id === 'create-offer-bg') close();
  });

  $('#create-offer-form')?.addEventListener('submit', async (ev) => {
    ev.preventDefault();
    const form = ev.target;
    const alert = $('#create-offer-alert');
    alert?.classList.add('hidden');
    const fd = new FormData(form);
    const startsAt = `${fd.get('startsAt')}T00:00:00.000Z`;
    const endsAt = `${fd.get('endsAt')}T23:59:59.000Z`;
    try {
      await api('/console/api/v1/offers', {
        method: 'POST',
        body: JSON.stringify({
          name: fd.get('name'),
          offerType: fd.get('offerType'),
          discountLabel: fd.get('discountLabel'),
          minOrderAmount: Number(fd.get('minOrderAmount')),
          startsAt,
          endsAt,
          description: fd.get('description') || undefined,
        }),
      });
      showToast('Offer created');
      close();
      onSaved();
    } catch (err) {
      if (alert) {
        alert.textContent = err.message;
        alert.classList.remove('hidden');
      }
    }
  });
}

export async function renderOffers() {
  const el = $('#main-content');
  el.innerHTML = '<div class="products-loading"><div class="spinner"></div></div>';

  try {
    const [offersData, couponsData] = await Promise.all([
      api(`/console/api/v1/offers?tab=${encodeURIComponent(state.offers.tab)}`),
      api('/console/api/v1/coupons'),
    ]);

    const tabCounts = offersData.tabCounts || {};
    const offers = offersData.offers || [];
    const coupons = couponsData.coupons || [];

    const offerRows = offers
      .map((o) => {
        const st = OFFER_STATUS_UI[o.status] || OFFER_STATUS_UI.active;
        return `
      <tr>
        <td class="col-offer-name"><strong>${escapeHtml(o.name)}</strong></td>
        <td>${escapeHtml(o.type)}</td>
        <td class="col-discount">${escapeHtml(o.discount)}</td>
        <td>${formatInrFull(o.minOrder)}</td>
        <td class="col-validity">${escapeHtml(o.validity)}</td>
        <td><span class="offer-status offer-status-${st.tone}">${escapeHtml(st.label)}</span></td>
        <td class="col-actions">
          <button type="button" class="action-icon" title="View" data-offer-view="${escapeHtml(o.id)}">${icon('eye', 'icon-action')}</button>
        </td>
      </tr>`;
      })
      .join('');

    const couponRows = coupons
      .map(
        (c) => `
      <tr>
        <td class="col-coupon-code"><strong>${escapeHtml(c.code)}</strong></td>
        <td class="col-discount">${escapeHtml(c.discount)}</td>
        <td>${formatInrFull(c.minOrder)}</td>
        <td>${escapeHtml(c.usageLabel)}</td>
        <td class="col-validity">${escapeHtml(c.validTill)}</td>
        <td><span class="coupon-status-pill">Active</span></td>
      </tr>`
      )
      .join('');

    el.innerHTML = `
      <div class="offers-page products-page">
        <nav class="orders-tabs offers-tabs" aria-label="Offer status">${renderOfferTabs(tabCounts)}</nav>

        <div class="products-table-card offers-table-card">
          <div class="table-wrap">
            <table class="products-table offers-table">
              <thead>
                <tr>
                  <th>Offer Name</th>
                  <th>Type</th>
                  <th>Discount</th>
                  <th>Min. Order</th>
                  <th>Validity</th>
                  <th>Status</th>
                  <th class="col-actions-h">Action</th>
                </tr>
              </thead>
              <tbody>${offerRows || '<tr><td colspan="7" class="empty-state">No offers in this tab</td></tr>'}</tbody>
            </table>
          </div>
        </div>

        <h2 class="offers-section-title">Active Coupons</h2>

        <div class="products-table-card coupons-table-card">
          <div class="table-wrap">
            <table class="products-table coupons-table">
              <thead>
                <tr>
                  <th>Coupon Code</th>
                  <th>Discount</th>
                  <th>Min. Order</th>
                  <th>Usage</th>
                  <th>Valid Till</th>
                  <th>Status</th>
                </tr>
              </thead>
              <tbody>${couponRows || '<tr><td colspan="6" class="empty-state">No active coupons</td></tr>'}</tbody>
            </table>
          </div>
        </div>
      </div>`;

    el.querySelectorAll('[data-offer-tab]').forEach((btn) => {
      btn.addEventListener('click', () => {
        state.offers.tab = btn.dataset.offerTab;
        renderOffers();
      });
    });

    el.querySelectorAll('[data-offer-view]').forEach((btn) => {
      btn.addEventListener('click', () => showOfferDetail(btn.dataset.offerView));
    });
  } catch (err) {
    el.innerHTML = `<div class="alert alert-error">${escapeHtml(err.message)}</div>`;
  }
}

export function bindOffersTopbar() {
  if (!canEdit()) return;
  $('#topbar-actions').innerHTML =
    '<button type="button" class="btn btn-primary btn-sm btn-add-product" id="btn-create-offer">' +
    icon('plus', 'icon-btn') +
    ' Create Offer</button>';
  $('#btn-create-offer')?.addEventListener('click', () => {
    openCreateOfferModal(() => renderOffers());
  });
}
