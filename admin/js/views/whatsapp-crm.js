import { $, api, state, escapeHtml, canEdit, showToast } from '../core.js';
import { icon } from '../icons.js';

let selectedFarmerId = null;

async function loadThread(farmerId) {
  const pane = $('#wa-thread-pane');
  if (!pane || !farmerId) return;

  pane.innerHTML = '<div class="products-loading"><div class="spinner"></div></div>';

  try {
    const [threadsRes, messagesRes, sessionRes] = await Promise.all([
      api('/console/api/v1/telecaller/whatsapp'),
      api(`/console/api/v1/telecaller/whatsapp/${farmerId}/messages`),
      api(`/console/api/v1/whatsapp/${farmerId}/session`).catch(() => ({ session: null })),
    ]);

    const thread = (threadsRes.threads || []).find((t) => t.farmerId === farmerId);
    const messages = messagesRes.messages || [];
    const session = sessionRes?.session || null;

    const bubbles = messages
      .map(
        (m) => `
      <div class="wa-bubble wa-bubble-${m.direction === 'inbound' ? 'in' : 'out'}">
        <p>${escapeHtml(m.content || '')}</p>
        <time>${escapeHtml(m.atLabel || '')}</time>
      </div>`
      )
      .join('');

    pane.innerHTML = `
      <header class="wa-thread-header">
        <div>
          <strong>${escapeHtml(thread?.farmerName || 'Farmer')}</strong>
          <p class="tc-muted">${escapeHtml(thread?.phone || '')}</p>
          <p class="tc-muted" style="margin-top:4px">
            ${escapeHtml(session?.preferred_language || thread?.preferredLanguage || 'en').toUpperCase()}
            · Owner: ${escapeHtml(session?.conversation_owner || 'ai')}
            ${session?.ai_paused ? '· AI paused' : ''}
          </p>
        </div>
        ${
          thread?.phone
            ? `<a href="https://wa.me/91${String(thread.phone).replace(/\D/g, '').slice(-10)}" target="_blank" rel="noopener" class="btn btn-secondary btn-sm">${icon('whatsapp', 'icon-btn')} Open in WhatsApp</a>`
            : ''
        }
      </header>
      ${
        canEdit()
          ? `<div class="wa-thread-actions" style="display:flex;gap:8px; padding: 0 16px 12px;">
            <button type="button" class="btn btn-secondary btn-sm" data-wa-toggle-ai>
              ${session?.ai_paused ? 'Resume AI' : 'Pause AI'}
            </button>
            <select class="input" style="max-width:180px" data-wa-lang>
              ${['en','ml','ta','kn','hi'].map((l)=>`<option value="${l}" ${String(session?.preferred_language||'')===l?'selected':''}>${l.toUpperCase()}</option>`).join('')}
            </select>
            <select class="input" style="max-width:180px" data-wa-owner>
              ${['ai','telecaller','agronomist'].map((o)=>`<option value="${o}" ${String(session?.conversation_owner||'ai')===o?'selected':''}>${o}</option>`).join('')}
            </select>
            <button type="button" class="btn btn-primary btn-sm" data-wa-save>Save</button>
          </div>`
          : ''
      }
      <div class="wa-messages" id="wa-messages">${bubbles || '<p class="tc-muted">No messages yet. Send one below.</p>'}</div>
      ${
        canEdit()
          ? `<form class="wa-compose" id="wa-compose-form">
        <input type="text" name="text" class="input" placeholder="Type a message…" required />
        <button type="submit" class="btn btn-primary btn-sm">Send</button>
      </form>`
          : ''
      }`;

    const box = $('#wa-messages');
    if (box) box.scrollTop = box.scrollHeight;

    pane.querySelector('[data-wa-toggle-ai]')?.addEventListener('click', async () => {
      try {
        await api(`/console/api/v1/whatsapp/${farmerId}/session`, {
          method: 'PATCH',
          body: JSON.stringify({ aiPaused: !session?.ai_paused }),
        });
        showToast('Updated AI pause');
        loadThread(farmerId);
      } catch (err) {
        showToast(err.message, 'error');
      }
    });

    pane.querySelector('[data-wa-save]')?.addEventListener('click', async () => {
      try {
        const lang = pane.querySelector('[data-wa-lang]')?.value || null;
        const owner = pane.querySelector('[data-wa-owner]')?.value || 'ai';
        await api(`/console/api/v1/whatsapp/${farmerId}/session`, {
          method: 'PATCH',
          body: JSON.stringify({ preferredLanguage: lang, owner }),
        });
        showToast('Session updated');
        loadThread(farmerId);
      } catch (err) {
        showToast(err.message, 'error');
      }
    });

    $('#wa-compose-form')?.addEventListener('submit', async (e) => {
      e.preventDefault();
      const fd = new FormData(e.target);
      const text = String(fd.get('text') || '').trim();
      if (!text) return;
      try {
        const res = await api(`/console/api/v1/telecaller/whatsapp/${farmerId}/send`, {
          method: 'POST',
          body: JSON.stringify({ text }),
        });
        showToast(res.sent ? 'Message sent' : 'Message saved (configure WhatsApp API to deliver)');
        e.target.reset();
        loadThread(farmerId);
      } catch (err) {
        showToast(err.message, 'error');
      }
    });
  } catch (err) {
    pane.innerHTML = `<div class="alert alert-error">${escapeHtml(err.message)}</div>`;
  }
}

export async function renderWhatsAppCrm() {
  const el = $('#main-content');
  el.innerHTML = '<div class="products-loading"><div class="spinner"></div></div>';

  try {
    const data = await api('/console/api/v1/telecaller/whatsapp');
    const threads = data.threads || [];

    if (!selectedFarmerId && threads[0]) selectedFarmerId = threads[0].farmerId;

    const list = threads
      .map((t) => {
        const active = t.farmerId === selectedFarmerId ? 'active' : '';
        return `<button type="button" class="wa-thread-item ${active}" data-farmer-id="${escapeHtml(t.farmerId)}">
          <span class="tc-avatar-sm">${escapeHtml(String(t.farmerName || 'F').slice(0, 2).toUpperCase())}</span>
          <div class="wa-thread-preview">
            <strong>${escapeHtml(t.farmerName)}</strong>
            <p>${escapeHtml(t.lastMessage || '')}</p>
            <small>${escapeHtml(t.lastAt || '')}</small>
          </div>
        </button>`;
      })
      .join('');

    el.innerHTML = `
      <div class="wa-inbox">
        <aside class="wa-thread-list">
          <div class="wa-list-header">
            <h3>Conversations</h3>
            <span class="tc-muted">${threads.length} chats</span>
          </div>
          <div class="wa-thread-scroll">${list || '<p class="tc-muted" style="padding:16px">No WhatsApp messages yet</p>'}</div>
        </aside>
        <div class="wa-thread-pane" id="wa-thread-pane">
          <div class="wa-thread-empty">
            <p>Select a conversation or seed demo data with <code>npm run crm:seed</code></p>
          </div>
        </div>
      </div>`;

    el.querySelectorAll('.wa-thread-item').forEach((btn) => {
      btn.addEventListener('click', () => {
        selectedFarmerId = btn.dataset.farmerId;
        renderWhatsAppCrm();
      });
    });

    if (selectedFarmerId) await loadThread(selectedFarmerId);
  } catch (err) {
    el.innerHTML = `<div class="alert alert-error">${escapeHtml(err.message)}</div>`;
  }
}
