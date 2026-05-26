import { $, api, state, escapeHtml } from './core.js';
import { icon } from './icons.js';

let bound = false;

function renderResults(results) {
  const groups = [
    { key: 'farmers', label: 'Farmers', items: results.farmers || [] },
    { key: 'leads', label: 'Leads', items: results.leads || [] },
    { key: 'orders', label: 'Orders', items: results.orders || [] },
  ];

  const html = groups
    .filter((g) => g.items.length)
    .map(
      (g) => `
    <div class="search-group">
      <p class="search-group-label">${escapeHtml(g.label)}</p>
      ${g.items
        .map(
          (item, i) => `
        <button type="button" class="search-result ${i === 0 ? 'focused' : ''}" data-hash="${escapeHtml(item.hash)}" data-lead-id="${escapeHtml(item.meta?.leadId || '')}">
          <span class="search-result-title">${escapeHtml(item.title)}</span>
          <span class="search-result-sub">${escapeHtml(item.subtitle || '')}</span>
        </button>`
        )
        .join('')}
    </div>`
    )
    .join('');

  return html || '<p class="search-empty">No results found</p>';
}

function closePalette() {
  const root = $('#search-palette');
  if (root) {
    root.classList.add('hidden');
    root.innerHTML = '';
  }
}

function openPalette() {
  let root = $('#search-palette');
  if (!root) {
    root = document.createElement('div');
    root.id = 'search-palette';
    document.body.appendChild(root);
  }
  root.classList.remove('hidden');
  root.innerHTML = `
    <div class="search-palette-backdrop" id="search-palette-bg">
      <div class="search-palette-card" role="dialog" aria-label="Search">
        <div class="search-palette-input-wrap">
          ${icon('search', 'icon-search-inline')}
          <input type="search" id="search-palette-input" class="search-palette-input" placeholder="Search farmers, mobile, order ID…" autocomplete="off" />
          <kbd class="search-kbd">Esc</kbd>
        </div>
        <div class="search-palette-results" id="search-palette-results">
          <p class="search-empty">Type at least 2 characters…</p>
        </div>
      </div>
    </div>`;

  const input = $('#search-palette-input');
  input?.focus();

  let timer;
  input?.addEventListener('input', () => {
    clearTimeout(timer);
    timer = setTimeout(async () => {
      const q = input.value.trim();
      const box = $('#search-palette-results');
      if (!box) return;
      if (q.length < 2) {
        box.innerHTML = '<p class="search-empty">Type at least 2 characters…</p>';
        return;
      }
      box.innerHTML = '<p class="search-empty">Searching…</p>';
      try {
        const data = await api(`/console/api/v1/search?q=${encodeURIComponent(q)}`);
        box.innerHTML = renderResults(data.results);
        box.querySelectorAll('.search-result').forEach((btn) => {
          btn.addEventListener('click', () => {
            const leadId = btn.dataset.leadId;
            if (leadId) state.telecaller.selectedLeadId = leadId;
            location.hash = btn.dataset.hash;
            closePalette();
          });
        });
      } catch (err) {
        box.innerHTML = `<p class="search-empty">${escapeHtml(err.message)}</p>`;
      }
    }, 200);
  });

  $('#search-palette-bg')?.addEventListener('click', (e) => {
    if (e.target.id === 'search-palette-bg') closePalette();
  });
}

export function initSearchPalette() {
  if (bound) return;
  bound = true;

  document.addEventListener('keydown', (e) => {
    if ((e.ctrlKey || e.metaKey) && e.key === 'k') {
      e.preventDefault();
      openPalette();
    }
    if (e.key === 'Escape') closePalette();
  });

  $('#btn-search')?.addEventListener('click', () => openPalette());
}
