import { $, api, state, escapeHtml, formatTrend } from '../core.js';
import { icon } from '../icons.js';

let diagnosisChart = null;
let cropsChart = null;

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

export function teardownAiAdvisory() {
  if (diagnosisChart) {
    diagnosisChart.destroy();
    diagnosisChart = null;
  }
  if (cropsChart) {
    cropsChart.destroy();
    cropsChart = null;
  }
}

function kpiCard(label, value, trendPct, compareNote, subNote) {
  const t = formatTrend(trendPct);
  return `<article class="ai-kpi-card">
    <span class="ai-kpi-label">${escapeHtml(label)}</span>
    <span class="ai-kpi-value">${escapeHtml(String(value))}</span>
    <div class="ai-kpi-trend ${t.up ? 'trend-up' : 'trend-down'}">
      <span class="trend-pct">${escapeHtml(t.text)}</span>
      <span class="trend-vs">${escapeHtml(compareNote)}</span>
    </div>
    ${subNote ? `<span class="ai-kpi-sub muted">${escapeHtml(subNote)}</span>` : ''}
  </article>`;
}

function rankedList(items, valueKey = 'count') {
  if (!items?.length) {
    return '<p class="muted ai-list-empty">No data yet</p>';
  }
  return `<ol class="ai-ranked-list">
    ${items
      .map(
        (item, i) => `
      <li>
        <span class="ai-rank">${i + 1}</span>
        <span class="ai-rank-label">${escapeHtml(item.label)}</span>
        <span class="ai-rank-value">${Number(item[valueKey]).toLocaleString('en-IN')}</span>
      </li>`
      )
      .join('')}
  </ol>`;
}

function cropLegend(crops, total) {
  return crops
    .map(
      (c) => `
    <div class="ai-crop-legend-item">
      <span class="ai-crop-dot" style="background:${escapeHtml(c.color)}"></span>
      <span class="ai-crop-name">${escapeHtml(c.label)}</span>
      <span class="ai-crop-pct">${c.percent}%</span>
      <span class="ai-crop-count muted">(${Number(c.count).toLocaleString('en-IN')})</span>
    </div>`
    )
    .join('');
}

async function renderDiagnosisChart(trend) {
  const canvas = $('#ai-diagnosis-chart');
  if (!canvas) return;
  const Chart = await loadChartJs();
  if (diagnosisChart) diagnosisChart.destroy();

  diagnosisChart = new Chart(canvas, {
    type: 'line',
    data: {
      labels: trend.labels,
      datasets: [
        {
          label: 'Diagnoses',
          data: trend.diagnoses,
          borderColor: '#34b35e',
          backgroundColor: 'rgba(52, 179, 94, 0.06)',
          borderWidth: 2.5,
          tension: 0.35,
          yAxisID: 'y',
          pointRadius: 4,
          pointBackgroundColor: '#34b35e',
          fill: true,
        },
        {
          label: 'Success Rate (%)',
          data: trend.successRate,
          borderColor: '#2563eb',
          backgroundColor: 'transparent',
          borderWidth: 2,
          tension: 0.35,
          yAxisID: 'y1',
          pointRadius: 3,
          pointBackgroundColor: '#2563eb',
        },
      ],
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      interaction: { mode: 'index', intersect: false },
      plugins: {
        legend: {
          position: 'top',
          align: 'end',
          labels: { boxWidth: 12, font: { size: 12 } },
        },
      },
      scales: {
        x: { grid: { display: false }, ticks: { color: '#94a3a8', font: { size: 11 } } },
        y: {
          position: 'left',
          beginAtZero: true,
          ticks: {
            color: '#94a3a8',
            callback: (v) => (v >= 1000 ? v / 1000 + 'k' : v),
          },
          grid: { color: '#eef2ef' },
        },
        y1: {
          position: 'right',
          min: 0,
          max: 100,
          ticks: { color: '#94a3a8', callback: (v) => v + '%' },
          grid: { drawOnChartArea: false },
        },
      },
    },
  });
}

async function renderCropsChart(crops, totalDiagnoses) {
  const canvas = $('#ai-crops-chart');
  if (!canvas) return;
  const Chart = await loadChartJs();
  if (cropsChart) cropsChart.destroy();

  cropsChart = new Chart(canvas, {
    type: 'doughnut',
    data: {
      labels: crops.map((c) => c.label),
      datasets: [
        {
          data: crops.map((c) => c.count),
          backgroundColor: crops.map((c) => c.color),
          borderWidth: 0,
          hoverOffset: 6,
        },
      ],
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      cutout: '68%',
      plugins: { legend: { display: false } },
    },
    plugins: [
      {
        id: 'centerText',
        beforeDraw(chart) {
          const { ctx, chartArea } = chart;
          if (!chartArea) return;
          const centerX = (chartArea.left + chartArea.right) / 2;
          const centerY = (chartArea.top + chartArea.bottom) / 2;
          ctx.save();
          ctx.textAlign = 'center';
          ctx.textBaseline = 'middle';
          ctx.fillStyle = '#94a3a8';
          ctx.font = '600 11px Inter, sans-serif';
          ctx.fillText('Total', centerX, centerY - 10);
          ctx.fillStyle = '#1a2e22';
          ctx.font = '800 18px Inter, sans-serif';
          ctx.fillText(totalDiagnoses.toLocaleString('en-IN'), centerX, centerY + 12);
          ctx.restore();
        },
      },
    ],
  });
}

function renderLogsTable(logs) {
  if (!logs?.length) {
    return '<p class="empty-state">No advisory sessions logged yet.</p>';
  }
  return `
    <div class="table-wrap">
      <table class="products-table ai-logs-table">
        <thead>
          <tr>
            <th>Farmer</th>
            <th>Crop</th>
            <th>Issue</th>
            <th>Channel</th>
            <th>Status</th>
            <th>Confidence</th>
            <th>Date</th>
          </tr>
        </thead>
        <tbody>
          ${logs
            .map(
              (l) => `
            <tr>
              <td>${escapeHtml(l.farmerName)}</td>
              <td>${escapeHtml(l.cropType)}</td>
              <td>${escapeHtml(l.issue)}</td>
              <td>${escapeHtml(l.channel)}</td>
              <td><span class="ai-log-status ai-log-${escapeHtml(l.status)}">${escapeHtml(l.status)}</span></td>
              <td>${l.confidence != null ? escapeHtml(l.confidence + '%') : '—'}</td>
              <td class="col-date">${escapeHtml(new Date(l.createdAt).toLocaleString('en-IN', { dateStyle: 'medium', timeStyle: 'short' }))}</td>
            </tr>`
            )
            .join('')}
        </tbody>
      </table>
    </div>`;
}

export async function renderAiAdvisory() {
  const el = $('#main-content');
  el.innerHTML = '<div class="products-loading"><div class="spinner"></div></div>';
  teardownAiAdvisory();

  try {
    const [overview, logsData] = await Promise.all([
      api('/console/api/v1/ai-advisory/overview'),
      state.aiAdvisory.showLogs
        ? api(`/console/api/v1/ai-advisory/logs?page=${state.aiAdvisory.logsPage}`)
        : Promise.resolve({ logs: [] }),
    ]);

    const k = overview.kpis;
    const compare = k.compareLabel || 'last 30 days';

    const logsSection = state.aiAdvisory.showLogs
      ? `<section class="card ai-logs-card" id="ai-logs-section">
          <div class="card-head">
            <h3>Advisory session logs</h3>
            <button type="button" class="btn btn-secondary btn-sm" id="ai-logs-close">Close logs</button>
          </div>
          ${renderLogsTable(logsData.logs)}
        </section>`
      : '';

    el.innerHTML = `
      <div class="ai-advisory-page">
        <div class="ai-kpi-grid">
          ${kpiCard('Total Diagnoses', k.totalDiagnoses.toLocaleString('en-IN'), k.totalDiagnosesTrend, `vs ${compare}`)}
          ${kpiCard('Successful Recommendations', k.successfulRecommendations.toLocaleString('en-IN'), k.successfulRateTrend, 'vs total diagnoses')}
          ${kpiCard('Farmer Queries', k.farmerQueries.toLocaleString('en-IN'), k.farmerQueriesTrend, `vs ${compare}`)}
          ${kpiCard('Top Accuracy', k.topAccuracy + '%', k.accuracyTrend, `vs ${compare}`)}
        </div>

        <div class="ai-mid-grid">
          <section class="card card-chart">
            <div class="card-head"><h3>Diagnosis Trend</h3></div>
            <div class="chart-wrap ai-chart-wrap">
              <canvas id="ai-diagnosis-chart" height="260"></canvas>
            </div>
          </section>
          <section class="card">
            <div class="card-head"><h3>Top Symptoms Detected</h3></div>
            <div class="card-body-pad">${rankedList(overview.topSymptoms)}</div>
          </section>
        </div>

        <div class="ai-bottom-grid">
          <section class="card">
            <div class="card-head"><h3>Top Crops Queried</h3></div>
            <div class="ai-crops-layout">
              <div class="ai-crops-chart-wrap">
                <canvas id="ai-crops-chart" height="220"></canvas>
              </div>
              <div class="ai-crop-legend">${cropLegend(overview.topCrops, k.totalDiagnoses)}</div>
            </div>
          </section>
          <section class="card">
            <div class="card-head"><h3>Top Recommended Products</h3></div>
            <div class="card-body-pad">${rankedList(overview.topProducts)}</div>
          </section>
        </div>
        ${logsSection}
        ${overview.source === 'demo' ? '<p class="ai-demo-note muted">Showing sample analytics — run crop doctor sessions to populate live data.</p>' : ''}
      </div>`;

    await renderDiagnosisChart(overview.diagnosisTrend);
    await renderCropsChart(overview.topCrops, k.totalDiagnoses);

    $('#ai-logs-close')?.addEventListener('click', () => {
      state.aiAdvisory.showLogs = false;
      renderAiAdvisory();
    });

    if (state.aiAdvisory.showLogs) {
      document.getElementById('ai-logs-section')?.scrollIntoView({ behavior: 'smooth' });
    }
  } catch (err) {
    el.innerHTML = `<div class="alert alert-error">${escapeHtml(err.message)}</div>`;
  }
}

export function bindAiAdvisoryTopbar() {
  $('#topbar-actions').innerHTML =
    '<button type="button" class="btn btn-secondary btn-sm" id="btn-ai-logs">' +
    icon('content', 'icon-btn') +
    ' View Logs</button>';
  $('#btn-ai-logs')?.addEventListener('click', () => {
    state.aiAdvisory.showLogs = !state.aiAdvisory.showLogs;
    state.aiAdvisory.logsPage = 1;
    renderAiAdvisory();
  });
}
