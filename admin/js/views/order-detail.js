import { $, api, escapeHtml, formatInrFull } from '../core.js';
import { icon } from '../icons.js';

const STATUS_UI = {
  pending: { label: 'Pending', tone: 'pending' },
  processing: { label: 'Processing', tone: 'processing' },
  shipped: { label: 'Shipped', tone: 'shipped' },
  delivered: { label: 'Delivered', tone: 'delivered' },
  cancelled: { label: 'Cancelled', tone: 'cancelled' },
};

function summaryCard(label, value, sub, tone = 'default') {
  const subHtml = sub
    ? `<span class="od-summary-sub od-summary-sub-${tone}"><span class="od-dot"></span>${escapeHtml(sub)}</span>`
    : '';
  return `<div class="od-summary-card">
    <span class="od-summary-label">${escapeHtml(label)}</span>
    <span class="od-summary-value">${escapeHtml(value)}</span>
    ${subHtml}
  </div>`;
}

function renderLineRows(items) {
  return items
    .map(
      (li) => `
    <tr>
      <td class="od-col-product">${escapeHtml(li.product)}</td>
      <td>${escapeHtml(li.variant)}</td>
      <td>${formatInrFull(li.mrp)}</td>
      <td>${formatInrFull(li.price)}</td>
      <td class="od-col-qty">${li.qty}</td>
      <td class="od-col-total">${li.isFree ? '<span class="od-free">Free</span>' : formatInrFull(li.total)}</td>
    </tr>`
    )
    .join('');
}

function renderTimeline(steps) {
  return steps
    .map((step, i) => {
      const isLast = i === steps.length - 1;
      const state = step.done ? 'done' : step.pending ? 'pending' : 'upcoming';
      return `
      <li class="od-timeline-step od-timeline-${state} ${isLast ? 'od-timeline-last' : ''}">
        <span class="od-timeline-marker" aria-hidden="true">
          ${step.done ? icon('check', 'od-timeline-icon') : '<span class="od-timeline-circle"></span>'}
        </span>
        <div class="od-timeline-body">
          <span class="od-timeline-label">${escapeHtml(step.label)}</span>
          ${
            step.at
              ? `<span class="od-timeline-time">${escapeHtml(step.at)}</span>`
              : step.pending
                ? '<span class="od-timeline-time od-timeline-pending-label">Pending</span>'
                : ''
          }
        </div>
      </li>`;
    })
    .join('');
}

export async function renderOrderDetail(orderId) {
  const el = $('#main-content');
  el.innerHTML = '<div class="products-loading"><div class="spinner"></div></div>';

  try {
    const data = await api(`/console/api/v1/orders/${orderId}`);
    const o = data.order;
    const st = STATUS_UI[o.status] || STATUS_UI.processing;
    const payTone = o.paymentStatus === 'Paid' || String(o.paymentStatus).startsWith('Paid') ? 'success' : 'warn';
    const statusTone = o.status === 'delivered' || o.status === 'shipped' ? 'success' : st.tone;

    const addressLines = (o.shipping?.addressLines || [])
      .map((line) => `<p>${escapeHtml(line)}</p>`)
      .join('');

    el.innerHTML = `
      <div class="order-detail-page" id="order-detail-print">
        <div class="od-toolbar no-print">
          <a href="#orders" class="od-back-link">${icon('arrowLeft', 'icon-back')} Back to Orders</a>
          <button type="button" class="btn btn-primary btn-sm" id="btn-print-invoice">
            ${icon('printer', 'icon-btn')}
            Print Invoice
          </button>
        </div>

        <div class="od-summary-grid">
          ${summaryCard('Order ID', o.displayOrderId)}
          ${summaryCard('Order Date', o.orderDate)}
          ${summaryCard('Payment', formatInrFull(o.amount), o.paymentLabel, payTone)}
          ${summaryCard('Status', o.statusLabel, null, statusTone)}
          ${summaryCard('Payment Status', o.paymentStatus, null, payTone)}
        </div>

        <div class="od-info-grid">
          <section class="od-info-card">
            <h3 class="od-section-title">Customer Details</h3>
            <p class="od-customer-name">${escapeHtml(o.customer.name)}</p>
            <p class="od-info-line">${icon('phone', 'od-info-icon')} ${escapeHtml(o.customer.phone || '—')}</p>
            <p class="od-info-line">${icon('location', 'od-info-icon')} ${escapeHtml(o.customer.addressShort)}</p>
          </section>
          <section class="od-info-card">
            <h3 class="od-section-title">Shipping Details</h3>
            <p class="od-customer-name">${escapeHtml(o.shipping.name)}</p>
            <div class="od-address-block">${addressLines || '<p>—</p>'}</div>
            <p class="od-ship-meta"><strong>Courier:</strong> ${escapeHtml(o.shipping.courier)}</p>
            <p class="od-ship-meta"><strong>Tracking ID:</strong> ${escapeHtml(o.shipping.trackingId)}</p>
          </section>
        </div>

        <div class="od-products-card products-table-card">
          <div class="table-wrap">
            <table class="products-table od-products-table">
              <thead>
                <tr>
                  <th>Product</th>
                  <th>Variant</th>
                  <th>MRP</th>
                  <th>Price</th>
                  <th>Qty</th>
                  <th>Total</th>
                </tr>
              </thead>
              <tbody>${renderLineRows(o.lineItems || [])}</tbody>
            </table>
          </div>
          <div class="od-totals">
            <div class="od-totals-row"><span>Subtotal</span><span>${formatInrFull(o.totals.subtotal)}</span></div>
            <div class="od-totals-row"><span>Shipping</span><span>${formatInrFull(o.totals.shipping)}</span></div>
            <div class="od-totals-row od-totals-discount"><span>Discount</span><span>${o.totals.discount > 0 ? '−' + formatInrFull(o.totals.discount).slice(1) : formatInrFull(0)}</span></div>
            <div class="od-totals-row od-totals-grand"><span>Total</span><strong>${formatInrFull(o.totals.total)}</strong></div>
          </div>
        </div>

        <div class="od-bottom-grid">
          <section class="od-timeline-card">
            <h3 class="od-section-title">Order Timeline</h3>
            <ol class="od-timeline">${renderTimeline(o.timeline || [])}</ol>
          </section>
          <section class="od-notes-card">
            <h3 class="od-section-title">Order Notes</h3>
            <p class="od-notes-text">${escapeHtml(o.notes || 'No notes for this order.')}</p>
          </section>
        </div>
      </div>`;

    $('#btn-print-invoice')?.addEventListener('click', () => window.print());
  } catch (err) {
    el.innerHTML = `
      <div class="od-toolbar">
        <a href="#orders" class="od-back-link">${icon('arrowLeft', 'icon-back')} Back to Orders</a>
      </div>
      <div class="alert alert-error">${escapeHtml(err.message)}</div>`;
  }
}

export function bindOrderDetailTopbar() {
  $('#topbar-actions').innerHTML = '';
}
