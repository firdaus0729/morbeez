import { api } from './api';

const base = '/console/api/v1/os/telecaller';

export type ExportType = 'lead' | 'recommendations' | 'interactions' | 'findings';

export async function openLeadExport(leadId: string, type: ExportType = 'lead'): Promise<void> {
  const res = await api<{ ok: boolean; html: string }>(
    `${base}/leads/${leadId}/export?type=${encodeURIComponent(type)}`
  );
  const win = window.open('', '_blank');
  if (!win) {
    throw new Error('Allow pop-ups to export/print');
  }
  win.document.write(res.html);
  win.document.close();
  win.focus();
  setTimeout(() => win.print(), 400);
}

export async function openWhatsAppShare(
  leadId: string,
  opts: { type?: 'lead' | 'recommendation'; recId?: string } = {}
): Promise<void> {
  const q = new URLSearchParams({ type: opts.type ?? 'lead' });
  if (opts.recId) q.set('recId', opts.recId);
  const res = await api<{ ok: boolean; url?: string; message?: string }>(
    `${base}/leads/${leadId}/share?${q}`
  );
  if (res.url) {
    window.open(res.url, '_blank', 'noopener');
  } else {
    throw new Error('No phone number on this lead');
  }
}
