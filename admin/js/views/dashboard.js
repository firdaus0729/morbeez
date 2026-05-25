import {
  $,
  api,
  escapeHtml,
  formatInr,
  formatInrFull,
  formatTrend,
} from '../core.js';
import { icon } from '../icons.js';

let salesChartInstance = null;

function loadChartJs() {
  return new Promise((resolve, reject) => {
    if (window.Chart) {
      resolve(window.Chart);
      return;
    }
    const s = document.createElement('script');
    s.src = 'https://cdn.jsdelivr.net/npm/chart.js@4.4.1/dist/chart.umd.min.js';
    s.async = true;
    s.onload = () => resolve(window.Chart);
    s.onerror = reject;
    document.head.appendChild(s);
  });
}

function statCard(label, value, trendPct, compareLabel, iconName, iconClass, href) {
  const t = formatTrend(trendPct);
  const inner = `
      <div class="stat-card-head">
        <span class="stat-label">${escapeHtml(label)}</span>
        <span class="stat-icon ${iconClass}">${icon(iconName, 'icon-stat')}</span>
      </div>
      <div class="stat-value">${escapeHtml(value)}</div>
      <div class="stat-trend ${t.up ? 'trend-up' : 'trend-down'}">
        <span class="trend-pct">${escapeHtml(t.text)}</span>
        <span class="trend-vs">vs ${escapeHtml(compareLabel)}</span>
      </div>`;
  if (href) {
    return `<a href="${href}" class="stat-card stat-card-link">${inner}</a>`;
  }
  return `<article class="stat-card">${inner}</article>`;
}

function topProductRows(products) {
  if (!products?.length) {
    return `<div class="top-product-empty muted">No sales data yet — orders will appear here.</div>`;
  }
  return products
    .map(
      (p, i) => `
    <div class="top-product-row">
      <span class="top-product-rank">${i + 1}</span>
      ${
        p.imageUrl
          ? `<img class="top-product-img" src="${escapeHtml(p.imageUrl)}" alt="" loading="lazy" />`
          : '<span class="top-product-img top-product-img--ph"></span>'
      }
      <div class="top-product-info">
        <span class="top-product-name">${escapeHtml(p.title)}</span>
      </div>
      <span class="top-product-sales">${formatInrFull(p.revenue)}</span>
    </div>`
    )
    .join('');
}

function alertCard(label, count, tone, href) {
  const inner = `<span class="alert-card-label">${escapeHtml(label)}</span>
     <span class="alert-card-value alert-${tone}">${count}</span>
     <span class="alert-card-unit">${label.includes('Order') ? 'Orders' : 'Products'}</span>`;
  return href
    ? `<a href="${href}" class="alert-card">${inner}</a>`
    : `<div class="alert-card">${inner}</div>`;
}

async function renderSalesChart(chartData) {
  const canvas = $('#sales-chart');
  if (!canvas) return;

  try {
    const Chart = await loadChartJs();
    if (salesChartInstance) {
      salesChartInstance.destroy();
      salesChartInstance = null;
    }

    const max = Math.max(...chartData.values, 1);
    salesChartInstance = new Chart(canvas, {
      type: 'line',
      data: {
        labels: chartData.labels,
        datasets: [
          {
            label: 'Sales (₹)',
            data: chartData.values,
            borderColor: '#34b35e',
            backgroundColor: 'rgba(52, 179, 94, 0.08)',
            borderWidth: 2.5,
            fill: true,
            tension: 0.35,
            pointRadius: 4,
            pointBackgroundColor: '#34b35e',
            pointBorderColor: '#fff',
            pointBorderWidth: 2,
            pointHoverRadius: 6,
          },
        ],
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: { display: false },
          tooltip: {
            callbacks: {
              label: (ctx) => '₹' + Number(ctx.raw).toLocaleString('en-IN'),
            },
          },
        },
        scales: {
          x: {
            grid: { display: false },
            ticks: { color: '#94a3a8', font: { size: 11 } },
          },
          y: {
            beginAtZero: true,
            suggestedMax: max * 1.1,
            ticks: {
              color: '#94a3a8',
              font: { size: 11 },
              callback: (v) => (v >= 1000 ? v / 1000 + 'K' : v),
            },
            grid: { color: '#eef2ef' },
          },
        },
      },
    });
  } catch {
    canvas.parentElement.innerHTML =
      '<p class="muted" style="padding:40px;text-align:center">Chart unavailable</p>';
  }
}

export async function renderDashboard() {
  const el = $('#main-content');
  el.innerHTML = '<div class="dash-loading"><div class="spinner"></div><p>Loading dashboard…</p></div>';

  try {
    const data = await api('/console/api/v1/dashboard');
    const k = data.kpis;
    const a = data.alerts;
    const compare = k.compareLabel || 'previous period';

    el.innerHTML = `
      <div class="stat-grid">
        ${statCard('Total Sales', formatInrFull(k.revenueInr), k.revenueTrend, compare, 'sales', 'stat-icon-green')}
        ${statCard('Orders', Number(k.orders).toLocaleString('en-IN'), k.ordersTrend, compare, 'cart', 'stat-icon-blue')}
        ${statCard('Farmers', Number(k.farmers).toLocaleString('en-IN'), k.farmersTrend, compare, 'users', 'stat-icon-teal', '#farmers')}
        ${statCard('Conversion Rate', k.conversionRate + '%', k.conversionTrend, compare, 'trend', 'stat-icon-purple')}
        ${statCard('AI Diagnoses', Number(k.aiDiagnoses).toLocaleString('en-IN'), k.aiTrend, compare, 'ai', 'stat-icon-orange')}
        ${statCard('Avg. Order Value', formatInr(k.avgOrderValue), k.avgOrderTrend, compare, 'sales', 'stat-icon-green')}
      </div>

      <div class="dash-main-grid">
        <section class="card card-chart">
          <div class="card-head">
            <h3>Sales Overview</h3>
            <select class="card-select" id="chart-range" aria-label="Chart range">
              <option value="week" selected>This Week</option>
              <option value="month">This Month</option>
            </select>
          </div>
          <div class="chart-wrap">
            <canvas id="sales-chart" height="280"></canvas>
          </div>
        </section>

        <section class="card card-top-products">
          <div class="card-head">
            <h3>Top Products</h3>
          </div>
          <div class="top-products-list">
            ${topProductRows(data.topProducts)}
          </div>
        </section>
      </div>

      <div class="alert-grid">
        ${alertCard('Low Stock Alerts', a.lowStock, 'warn', '#inventory')}
        ${alertCard('Out of Stock', a.outOfStock, 'danger', '#inventory')}
        ${alertCard('Expiring Soon', a.expiringSoon, 'neutral', '#inventory')}
        ${alertCard('Pending Orders', a.pendingOrders, 'success', '#orders')}
      </div>`;

    await renderSalesChart(data.salesChart);
  } catch (err) {
    el.innerHTML = `<div class="alert alert-error">${escapeHtml(err.message)}</div>`;
  }
}
