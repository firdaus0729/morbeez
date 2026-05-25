import { $, api, escapeHtml, formatDate, formatInr } from '../core.js';
import { icon } from '../icons.js';

export async function renderDashboard() {
  const el = $('#main-content');
  el.innerHTML = '<p class="loading">Loading dashboard…</p>';
  try {
    const data = await api('/console/api/v1/dashboard');
    const k = data.kpis;

    el.innerHTML = `
      <div class="kpi-grid">
        ${kpiCard('Revenue (Razorpay)', formatInr(k.revenueInr), 'Paid checkout sessions', 'analytics')}
        ${kpiCard('Orders', String(k.orders + k.paidCheckouts), `${k.paidCheckouts} Razorpay · ${k.orders} Shopify sync`, 'orders')}
        ${kpiCard('Farmers', String(k.farmers), `+${k.farmersThisWeek} this week`, 'farmers')}
        ${kpiCard('Products', String(k.products), 'Shopify catalog', 'products')}
      </div>

      <div class="dash-grid">
        <div class="panel">
          <div class="panel-header">
            <h3>Recent orders</h3>
            <a href="#orders" class="btn btn-secondary btn-sm">View all</a>
          </div>
          <div class="table-wrap">
            <table class="table-compact">
              <thead><tr><th>Order</th><th>Customer</th><th>Amount</th><th>Date</th></tr></thead>
              <tbody>${orderRows(data.recentCheckouts, data.recentOrders)}</tbody>
            </table>
          </div>
        </div>

        <div class="panel">
          <div class="panel-header">
            <h3>New farmers</h3>
            <a href="#farmers" class="btn btn-secondary btn-sm">CRM</a>
          </div>
          <div class="table-wrap">
            <table class="table-compact">
              <thead><tr><th>Name</th><th>Phone</th><th>District</th><th>Joined</th></tr></thead>
              <tbody>${farmerRows(data.recentFarmers)}</tbody>
            </table>
          </div>
        </div>
      </div>

      <div class="dash-grid">
        <div class="panel">
          <div class="panel-header">
            <h3>${icon('inventory', 'icon-sm')} Low stock alert</h3>
            <a href="#inventory" class="btn btn-secondary btn-sm">Inventory</a>
          </div>
          <div class="panel-body">
            ${
              data.lowStock?.length
                ? `<ul class="alert-list">${data.lowStock
                    .map(
                      (p) =>
                        `<li><a href="#products/edit/${p.id}">${escapeHtml(p.title)}</a> <span class="badge badge-warn">${p.inventory} left</span></li>`
                    )
                    .join('')}</ul>`
                : '<p class="muted">No low-stock products (threshold ≤10 units).</p>'
            }
          </div>
        </div>

        <div class="panel">
          <div class="panel-header"><h3>${icon('ai', 'icon-sm')} AI commerce roadmap</h3></div>
          <div class="panel-body">
            <div class="roadmap">
              <div class="roadmap-item done"><span>Product intelligence fields</span><em>Live</em></div>
              <div class="roadmap-item done"><span>Razorpay checkout</span><em>Live</em></div>
              <div class="roadmap-item"><span>Offers & combos</span><em>Planned</em></div>
              <div class="roadmap-item"><span>AI diagnosis engine</span><em>Planned</em></div>
              <div class="roadmap-item"><span>WhatsApp campaigns</span><em>Planned</em></div>
            </div>
            <div class="quick-actions mt-4">
              <a href="#products/new" class="btn btn-primary btn-sm">+ Add product</a>
              <a href="#products" class="btn btn-secondary btn-sm">Catalog</a>
              <a href="#ai-advisory" class="btn btn-secondary btn-sm">AI panel</a>
            </div>
          </div>
        </div>
      </div>`;
  } catch (err) {
    el.innerHTML = `<div class="alert alert-error">${escapeHtml(err.message)}</div>`;
  }
}

function kpiCard(title, value, sub, iconName) {
  return `<div class="kpi-card">
    <div class="kpi-icon">${icon(iconName, 'icon-lg')}</div>
    <div class="kpi-body">
      <div class="kpi-label">${escapeHtml(title)}</div>
      <div class="kpi-value">${escapeHtml(value)}</div>
      <div class="kpi-sub">${escapeHtml(sub)}</div>
    </div>
  </div>`;
}

function orderRows(checkouts, commerce) {
  const rows = [];
  for (const c of checkouts || []) {
    rows.push(
      `<tr>
        <td><strong>${escapeHtml(c.orderName || '—')}</strong><br><small class="muted">Razorpay</small></td>
        <td>${escapeHtml(c.customerName || c.email || '—')}</td>
        <td>${formatInr(c.amountInr)}</td>
        <td>${formatDate(c.createdAt)}</td>
      </tr>`
    );
  }
  for (const o of commerce || []) {
    rows.push(
      `<tr>
        <td><strong>${escapeHtml(o.orderName || '—')}</strong><br><small class="muted">Shopify</small></td>
        <td>${escapeHtml(o.email || o.phone || '—')}</td>
        <td>${formatInr(o.totalAmount)}</td>
        <td>${formatDate(o.createdAt)}</td>
      </tr>`
    );
  }
  return rows.length ? rows.join('') : '<tr><td colspan="4" class="empty-state">No orders yet</td></tr>';
}

function farmerRows(farmers) {
  if (!farmers?.length) return '<tr><td colspan="4" class="empty-state">No farmers yet</td></tr>';
  return farmers
    .map(
      (f) =>
        `<tr>
          <td><strong>${escapeHtml(f.name)}</strong></td>
          <td>${escapeHtml(f.phone || '—')}</td>
          <td>${escapeHtml(f.district || '—')}</td>
          <td>${formatDate(f.createdAt)}</td>
        </tr>`
    )
    .join('');
}
