import { $, api, state, escapeHtml, formatInrFull, canEdit, showToast } from '../core.js';
import { icon } from '../icons.js';

const TABS = [
  { id: 'all', label: 'All' },
  { id: 'live', label: 'Active' },
  { id: 'upcoming', label: 'Upcoming' },
  { id: 'completed', label: 'Completed' },
];

const BADGE = {
  live: { label: 'Live', tone: 'live' },
  upcoming: { label: 'Upcoming', tone: 'upcoming' },
  completed: { label: 'Completed', tone: 'completed' },
};

let countdownTimer = null;

function summaryCard(label, value, tone) {
  return `<div class="product-summary-card">
    <span class="product-summary-label">${escapeHtml(label)}</span>
    <span class="product-summary-value product-summary-${tone}">${escapeHtml(String(value))}</span>
  </div>`;
}

function renderTabs(tabCounts) {
  return TABS.map((tab) => {
    const active = state.flashSales.tab === tab.id ? 'active' : '';
    return `<button type="button" class="orders-tab ${active}" data-flash-tab="${tab.id}">
      ${escapeHtml(tab.label)}
    </button>`;
  }).join('');
}

function pad2(n) {
  return String(n).padStart(2, '0');
}

function updateCountdowns() {
  const now = Date.now();
  document.querySelectorAll('[data-countdown]').forEach((el) => {
    const target = el.dataset.countdownTarget;
    const label = el.dataset.countdownLabel || 'Ends in';
    const labelEl = el.querySelector('[data-countdown-text]');
    if (labelEl) labelEl.textContent = label;

    const end = new Date(target).getTime();
    const diff = Math.max(0, end - now);

    const h = Math.floor(diff / 3600000);
    const m = Math.floor((diff % 3600000) / 60000);
    const s = Math.floor((diff % 60000) / 1000);

    const hEl = el.querySelector('[data-unit="h"]');
    const mEl = el.querySelector('[data-unit="m"]');
    const sEl = el.querySelector('[data-unit="s"]');
    if (hEl) hEl.textContent = pad2(h);
    if (mEl) mEl.textContent = pad2(m);
    if (sEl) sEl.textContent = pad2(s);
  });
}

function startCountdowns() {
  if (countdownTimer) clearInterval(countdownTimer);
  updateCountdowns();
  countdownTimer = setInterval(updateCountdowns, 1000);
}

function stopCountdowns() {
  if (countdownTimer) {
    clearInterval(countdownTimer);
    countdownTimer = null;
  }
}

function renderSaleCard(s) {
  const badge = BADGE[s.status] || BADGE.live;
  const img = s.imageUrl
    ? `<img class="flash-card-img" src="${escapeHtml(s.imageUrl)}" alt="" loading="lazy" />`
    : '<span class="flash-card-img flash-card-img--empty" aria-hidden="true"></span>';

  let timerBlock = '';
  if (s.status === 'live') {
    timerBlock = `
      <div class="flash-countdown" data-countdown data-countdown-target="${escapeHtml(s.endsAt)}" data-countdown-mode="ends">
        <span class="flash-countdown-label" data-countdown-text>Ends in</span>
        <div class="flash-countdown-units">
          <span class="flash-countdown-box"><b data-unit="h">00</b><small>h</small></span>
          <span class="flash-countdown-box"><b data-unit="m">00</b><small>m</small></span>
          <span class="flash-countdown-box"><b data-unit="s">00</b><small>s</small></span>
        </div>
      </div>`;
  } else if (s.status === 'upcoming') {
    timerBlock = `
      <div class="flash-countdown" data-countdown data-countdown-target="${escapeHtml(s.startsAt)}" data-countdown-mode="starts" data-countdown-label="Starts in">
        <span class="flash-countdown-label" data-countdown-text>Starts in</span>
        <div class="flash-countdown-units">
          <span class="flash-countdown-box"><b data-unit="h">00</b><small>h</small></span>
          <span class="flash-countdown-box"><b data-unit="m">00</b><small>m</small></span>
          <span class="flash-countdown-box"><b data-unit="s">00</b><small>s</small></span>
        </div>
      </div>`;
  }

  const stockLabel =
    s.status === 'completed'
      ? `<span>Sold <strong>${s.stockSold}</strong></span><span>Total Stock <strong>${s.stockTotal}</strong></span>`
      : `<span>Sold <strong>${s.stockSold}</strong></span><span>Stock Left <strong>${s.stockLeft}</strong></span>`;

  const barClass =
    s.status === 'completed' ? 'flash-progress-fill flash-progress-fill--done' : 'flash-progress-fill';

  return `
    <article class="flash-sale-card" data-sale-id="${escapeHtml(s.id)}">
      <span class="flash-badge flash-badge-${badge.tone}">${escapeHtml(badge.label)}</span>
      <div class="flash-card-body">
        ${img}
        <div class="flash-card-main">
          <h3 class="flash-card-title">${escapeHtml(s.productName)}</h3>
          <div class="flash-card-pricing">
            <span class="flash-price">${formatInrFull(s.flashPrice)}</span>
            <span class="flash-original">${formatInrFull(s.originalPrice)}</span>
            <span class="flash-discount-badge">${escapeHtml(s.discountLabel)}</span>
          </div>
          <div class="flash-card-meta">
            <div class="flash-stock-row">${stockLabel}</div>
            <div class="flash-progress-track">
              <div class="${barClass}" style="width:${s.soldPct}%"></div>
            </div>
            <p class="flash-schedule">
              <span>Start: ${escapeHtml(s.startLabel)}</span>
              <span>End: ${escapeHtml(s.endLabel)}</span>
            </p>
          </div>
        </div>
        ${timerBlock ? `<div class="flash-card-timer">${timerBlock}</div>` : ''}
      </div>
    </article>`;
}

function closeModal() {
  const root = $('#modal-root');
  if (root) {
    root.innerHTML = '';
    root.classList.add('hidden');
  }
}

function openCreateFlashSaleModal(onSaved) {
  const root = $('#modal-root');
  if (!root) return;
  root.classList.remove('hidden');
  const now = new Date();
  const start = now.toISOString().slice(0, 16);
  const end = new Date(now.getTime() + 3 * 24 * 3600000).toISOString().slice(0, 16);

  root.innerHTML = `
    <div class="modal-backdrop" id="flash-form-bg">
      <div class="modal-card modal-card-wide" role="dialog">
        <div class="modal-header">
          <h2>Create flash sale</h2>
          <button type="button" class="modal-close" id="flash-form-close" aria-label="Close">×</button>
        </div>
        <form id="flash-form" class="modal-body">
          <div id="flash-form-alert" class="alert alert-error hidden"></div>
          <div class="field field-full">
            <label>Product name</label>
            <input name="productName" class="input" required placeholder="Chakraveer 18.5 SC" />
          </div>
          <div class="form-row">
            <div class="field">
              <label>Flash price (₹)</label>
              <input name="flashPrice" type="number" min="0" class="input" required />
            </div>
            <div class="field">
              <label>Original price (₹)</label>
              <input name="originalPrice" type="number" min="0" class="input" required />
            </div>
          </div>
          <div class="form-row">
            <div class="field">
              <label>Starts</label>
              <input name="startsAt" type="datetime-local" class="input" required value="${start}" />
            </div>
            <div class="field">
              <label>Ends</label>
              <input name="endsAt" type="datetime-local" class="input" required value="${end}" />
            </div>
          </div>
          <div class="form-row">
            <div class="field">
              <label>Total stock</label>
              <input name="stockTotal" type="number" min="1" class="input" required value="100" />
            </div>
            <div class="field">
              <label>Image URL</label>
              <input name="imageUrl" type="url" class="input" placeholder="Optional" />
            </div>
          </div>
          <div class="modal-footer">
            <button type="button" class="btn btn-secondary" id="flash-form-cancel">Cancel</button>
            <button type="submit" class="btn btn-primary">Create flash sale</button>
          </div>
        </form>
      </div>
    </div>`;

  const close = () => closeModal();
  $('#flash-form-close')?.addEventListener('click', close);
  $('#flash-form-cancel')?.addEventListener('click', close);
  $('#flash-form-bg')?.addEventListener('click', (ev) => {
    if (ev.target.id === 'flash-form-bg') close();
  });

  $('#flash-form')?.addEventListener('submit', async (ev) => {
    ev.preventDefault();
    const alert = $('#flash-form-alert');
    alert?.classList.add('hidden');
    const fd = new FormData(ev.target);
    const startsAt = new Date(fd.get('startsAt')).toISOString();
    const endsAt = new Date(fd.get('endsAt')).toISOString();
    try {
      await api('/console/api/v1/flash-sales', {
        method: 'POST',
        body: JSON.stringify({
          productName: fd.get('productName'),
          flashPrice: Number(fd.get('flashPrice')),
          originalPrice: Number(fd.get('originalPrice')),
          startsAt,
          endsAt,
          stockTotal: Number(fd.get('stockTotal')),
          imageUrl: fd.get('imageUrl') || undefined,
        }),
      });
      showToast('Flash sale created');
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

export async function renderFlashSales() {
  const el = $('#main-content');
  el.innerHTML = '<div class="products-loading"><div class="spinner"></div></div>';
  stopCountdowns();

  try {
    const limit = state.flashSales.viewAll ? 50 : 4;
    const q = new URLSearchParams({
      page: String(state.flashSales.page),
      limit: String(limit),
      tab: state.flashSales.tab,
    });
    const data = await api(`/console/api/v1/flash-sales?${q}`);
    const stats = data.stats || {
      activeSales: 0,
      upcoming: 0,
      completed: 0,
      totalSalesMtd: 0,
      salesMonthLabel: 'May',
    };
    const tabCounts = data.tabCounts || {};
    const sales = data.sales || [];
    const pg = data.pagination;

    const salesLabel = `Total Sales (${stats.salesMonthLabel})`;
    const cards = sales.map(renderSaleCard).join('');

    const viewAllHtml =
      !state.flashSales.viewAll && pg.total > limit
        ? `<div class="flash-view-all-wrap">
            <button type="button" class="flash-view-all" id="flash-view-all">View All Flash Sales →</button>
          </div>`
        : state.flashSales.viewAll && pg.total > 4
          ? `<div class="flash-view-all-wrap">
              <button type="button" class="flash-view-all" id="flash-view-less">Show fewer flash sales</button>
            </div>`
          : '';

    el.innerHTML = `
      <div class="flash-sales-page products-page">
        <div class="product-summary-grid">
          ${summaryCard('Active Sales', stats.activeSales, 'default')}
          ${summaryCard('Upcoming', stats.upcoming, 'warn')}
          ${summaryCard('Completed', stats.completed, 'default')}
          ${summaryCard(salesLabel, formatInrFull(stats.totalSalesMtd), 'default')}
        </div>

        <nav class="orders-tabs flash-tabs" aria-label="Flash sale status">${renderTabs(tabCounts)}</nav>

        <div class="flash-sales-list">
          ${cards || '<p class="empty-state flash-empty">No flash sales in this tab</p>'}
        </div>
        ${viewAllHtml}
      </div>`;

    el.querySelectorAll('[data-flash-tab]').forEach((btn) => {
      btn.addEventListener('click', () => {
        state.flashSales.tab = btn.dataset.flashTab;
        state.flashSales.page = 1;
        renderFlashSales();
      });
    });

    $('#flash-view-all')?.addEventListener('click', () => {
      state.flashSales.viewAll = true;
      state.flashSales.page = 1;
      renderFlashSales();
    });

    $('#flash-view-less')?.addEventListener('click', () => {
      state.flashSales.viewAll = false;
      state.flashSales.page = 1;
      renderFlashSales();
    });

    startCountdowns();
  } catch (err) {
    el.innerHTML = `<div class="alert alert-error">${escapeHtml(err.message)}</div>`;
  }
}

export function bindFlashSalesTopbar() {
  if (!canEdit()) return;
  $('#topbar-actions').innerHTML =
    '<button type="button" class="btn btn-primary btn-sm btn-add-product" id="btn-create-flash">' +
    icon('plus', 'icon-btn') +
    ' Create Flash Sale</button>';
  $('#btn-create-flash')?.addEventListener('click', () => {
    openCreateFlashSaleModal(() => renderFlashSales());
  });
}

export function teardownFlashSales() {
  stopCountdowns();
}
