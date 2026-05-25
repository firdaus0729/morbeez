import { escapeHtml } from '../core.js';

const MODULE_COPY = {
  offers: {
    title: 'Offers & coupons',
    desc: 'Percentage discounts, crop-wise offers, cart value rules, festival campaigns, and auto-apply coupons.',
    features: ['Coupon codes', 'Buy X get Y', 'Dealer pricing tiers', 'First-order discount'],
  },
  combos: {
    title: 'Combo management',
    desc: 'Build pest control kits, crop-stage packages, drip + foliar bundles, and seasonal agriculture combos.',
    features: ['Multi-product kits', 'Suggested acreage', 'Combo MRP vs price', 'AI recommendation priority'],
  },
  'flash-sales': {
    title: 'Flash sales',
    desc: 'Countdown timers, limited quantity, region/crop-based lightning deals with FOMO counters.',
    features: ['Scheduled sales', 'Per-user limits', 'Stock locking', 'Dynamic flash pricing'],
  },
  'ai-advisory': {
    title: 'AI advisory engine',
    desc: 'Symptom → product mapping, crop stage logic, SPAD/soil pH rules, and recommendation priority for your AI stack.',
    features: ['Pest & disease tags', 'Severity scoring', 'Weather suitability', 'Rotation groups'],
    golden:
      'Golden columns (crop, pest, symptoms, dose, rotation) are captured per product under Edit product → AI mapping.',
  },
  whatsapp: {
    title: 'WhatsApp admin',
    desc: 'Broadcast campaigns, cart abandonment, spray reminders, and AI chatbot flows connected to your backend.',
    features: ['Campaign builder', 'Template messages', 'Lead follow-up', 'Order notifications'],
  },
  content: {
    title: 'Content management',
    desc: 'Blogs, crop guides, videos, home banners, and farmer education content for the storefront.',
    features: ['Blog posts', 'Crop guides', 'FAQ library', 'Homepage sliders'],
  },
  analytics: {
    title: 'Analytics',
    desc: 'Crop-wise sales, region demand, pest trends, and AI recommendation success metrics.',
    features: ['Crop-wise revenue', 'Seasonal trends', 'Conversion funnel', 'AI match rate'],
  },
};

export function renderModulePlaceholder(route) {
  const mod = MODULE_COPY[route] || { title: 'Module', desc: 'Coming soon.', features: [] };
  return `
    <div class="module-hero">
      <div class="module-hero-icon">${route === 'ai-advisory' ? '🌾' : '⚙️'}</div>
      <div>
        <h3>${escapeHtml(mod.title)}</h3>
        <p class="muted">${escapeHtml(mod.desc)}</p>
        ${mod.golden ? `<p class="module-golden">${escapeHtml(mod.golden)}</p>` : ''}
      </div>
    </div>
    <div class="feature-grid">
      ${mod.features
        .map(
          (f) =>
            `<div class="feature-card"><span class="feature-dot"></span><span>${escapeHtml(f)}</span></div>`
        )
        .join('')}
    </div>
    <div class="panel mt-4">
      <div class="panel-body">
        <p class="text-sm muted">This module is on the roadmap. Use <strong>Products</strong> with agriculture & AI tabs to store intelligence data today.</p>
        <a href="#dashboard" class="btn btn-secondary btn-sm mt-3">Back to dashboard</a>
      </div>
    </div>`;
}

export function renderSettings() {
  return `
    <div class="settings-grid">
      <div class="panel">
        <div class="panel-header"><h3>Store integrations</h3></div>
        <div class="panel-body">
          <ul class="settings-list">
            <li><strong>Shopify</strong> — product catalog & order sync</li>
            <li><strong>Razorpay</strong> — storefront checkout at <code>/pages/checkout</code></li>
            <li><strong>Supabase</strong> — farmers, checkout sessions, product intelligence</li>
            <li><strong>Render API</strong> — <code>${escapeHtml(window.location.origin)}</code></li>
          </ul>
        </div>
      </div>
      <div class="panel">
        <div class="panel-header"><h3>Product import columns</h3></div>
        <div class="panel-body">
          <p class="text-sm muted">Extended agriculture fields are saved per product (Basic, Agriculture, AI mapping, SEO, Cross-sell tabs). Full master import sheet spec is documented for CSV/Sheets import in a future release.</p>
          <p class="text-sm mt-2"><a href="https://github.com" class="link" onclick="return false">docs/ADMIN-PORTAL.md</a> in the project repo.</p>
        </div>
      </div>
      <div class="panel">
        <div class="panel-header"><h3>Staff roles</h3></div>
        <div class="panel-body">
          <ul class="settings-list">
            <li><strong>admin</strong> — full access including staff list</li>
            <li><strong>manager</strong> — products, farmers, orders</li>
            <li><strong>viewer</strong> — read-only (coming soon)</li>
          </ul>
        </div>
      </div>
    </div>`;
}
