import { useEffect, useRef, useState } from 'react';
import {
  Chart,
  LineController,
  LineElement,
  PointElement,
  LinearScale,
  CategoryScale,
  Filler,
  Tooltip,
} from 'chart.js';
import { PageShell } from '../components/ui';
import { api } from '../lib/api';
import { formatInr, formatInrFull, formatTrend } from '../lib/format';
import { StatIcon } from '../components/NavIcon';

Chart.register(
  LineController,
  LineElement,
  PointElement,
  LinearScale,
  CategoryScale,
  Filler,
  Tooltip
);

type Dashboard = {
  kpis: {
    farmers: number;
    farmersTrend: number;
    revenueInr: number;
    revenueTrend: number;
    orders: number;
    ordersTrend: number;
    conversionRate: number;
    conversionTrend: number;
    aiDiagnoses: number;
    aiTrend: number;
    avgOrderValue: number;
    avgOrderTrend: number;
    compareLabel?: string;
  };
  alerts: {
    lowStock: number;
    outOfStock: number;
    expiringSoon: number;
    pendingOrders: number;
  };
  salesChart: { labels: string[]; values: number[] };
  topProducts: Array<{ title: string; revenue: number; imageUrl?: string | null }>;
};

function StatCard({
  label,
  value,
  trendPct,
  compare,
  icon,
  iconClass,
}: {
  label: string;
  value: string;
  trendPct: number;
  compare: string;
  icon: string;
  iconClass: string;
}) {
  const t = formatTrend(trendPct);
  return (
    <article className="stat-card">
      <div className="stat-card-head">
        <span className="stat-label">{label}</span>
        <span className={`stat-icon ${iconClass}`}>
          <StatIcon name={icon} />
        </span>
      </div>
      <div className="stat-value">{value}</div>
      <div className={`stat-trend ${t.up ? 'trend-up' : 'trend-down'}`}>
        <span className="trend-pct">{t.text}</span>
        <span className="trend-vs">vs {compare}</span>
      </div>
    </article>
  );
}

function AlertCard({
  label,
  count,
  tone,
}: {
  label: string;
  count: number;
  tone: string;
}) {
  return (
    <div className="alert-card">
      <span className="alert-card-label">{label}</span>
      <span className={`alert-card-value alert-${tone}`}>{count}</span>
      <span className="alert-card-unit">{label.includes('Order') ? 'Orders' : 'Products'}</span>
    </div>
  );
}

export function DashboardPage() {
  const [data, setData] = useState<Dashboard | null>(null);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const chartRef = useRef<Chart | null>(null);

  useEffect(() => {
    api<{ ok: boolean } & Dashboard>('/console/api/v1/dashboard')
      .then((d) => setData(d))
      .catch((e) => setError(e instanceof Error ? e.message : 'Failed to load'))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    if (!data?.salesChart || !canvasRef.current) return;
    const chartData = data.salesChart;
    const max = Math.max(...chartData.values, 1);

    chartRef.current?.destroy();
    chartRef.current = new Chart(canvasRef.current, {
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
              callback: (v) => (Number(v) >= 1000 ? Number(v) / 1000 + 'K' : String(v)),
            },
            grid: { color: '#eef2ef' },
          },
        },
      },
    });

    return () => {
      chartRef.current?.destroy();
      chartRef.current = null;
    };
  }, [data]);

  if (loading) {
    return <PageShell loading loadingLabel="Loading dashboard…" />;
  }

  if (error) {
    return <div className="alert alert-error">{error}</div>;
  }

  if (!data) return null;

  const k = data.kpis;
  const a = data.alerts;
  const compare = k.compareLabel ?? 'previous period';

  return (
    <>
      <div className="stat-grid">
        <StatCard
          label="Total Sales"
          value={formatInrFull(k.revenueInr)}
          trendPct={k.revenueTrend}
          compare={compare}
          icon="sales"
          iconClass="stat-icon-green"
        />
        <StatCard
          label="Orders"
          value={Number(k.orders).toLocaleString('en-IN')}
          trendPct={k.ordersTrend}
          compare={compare}
          icon="cart"
          iconClass="stat-icon-blue"
        />
        <StatCard
          label="Farmers"
          value={Number(k.farmers).toLocaleString('en-IN')}
          trendPct={k.farmersTrend}
          compare={compare}
          icon="farmers"
          iconClass="stat-icon-teal"
        />
        <StatCard
          label="Conversion Rate"
          value={`${k.conversionRate}%`}
          trendPct={k.conversionTrend}
          compare={compare}
          icon="trend"
          iconClass="stat-icon-purple"
        />
        <StatCard
          label="AI Diagnoses"
          value={Number(k.aiDiagnoses).toLocaleString('en-IN')}
          trendPct={k.aiTrend}
          compare={compare}
          icon="ai"
          iconClass="stat-icon-orange"
        />
        <StatCard
          label="Avg. Order Value"
          value={formatInr(k.avgOrderValue)}
          trendPct={k.avgOrderTrend}
          compare={compare}
          icon="sales"
          iconClass="stat-icon-green"
        />
      </div>

      <div className="dash-main-grid">
        <section className="card card-chart">
          <div className="card-head">
            <h3>Sales Overview</h3>
            <select className="card-select" aria-label="Chart range" defaultValue="week">
              <option value="week">This Week</option>
              <option value="month">This Month</option>
            </select>
          </div>
          <div className="chart-wrap">
            <canvas ref={canvasRef} height={280} />
          </div>
        </section>

        <section className="card card-top-products">
          <div className="card-head">
            <h3>Top Products</h3>
          </div>
          <div className="top-products-list">
            {!data.topProducts?.length ? (
              <div className="top-product-empty muted">
                No sales data yet — orders will appear here.
              </div>
            ) : (
              data.topProducts.map((p, i) => (
                <div className="top-product-row" key={`${p.title}-${i}`}>
                  <span className="top-product-rank">{i + 1}</span>
                  {p.imageUrl ? (
                    <img className="top-product-img" src={p.imageUrl} alt="" loading="lazy" />
                  ) : (
                    <span className="top-product-img top-product-img--ph" />
                  )}
                  <div className="top-product-info">
                    <span className="top-product-name">{p.title}</span>
                  </div>
                  <span className="top-product-sales">{formatInrFull(p.revenue)}</span>
                </div>
              ))
            )}
          </div>
        </section>
      </div>

      <div className="alert-grid">
        <AlertCard label="Low Stock Alerts" count={a.lowStock} tone="warn" />
        <AlertCard label="Out of Stock" count={a.outOfStock} tone="danger" />
        <AlertCard label="Expiring Soon" count={a.expiringSoon} tone="neutral" />
        <AlertCard label="Pending Orders" count={a.pendingOrders} tone="success" />
      </div>
    </>
  );
}
