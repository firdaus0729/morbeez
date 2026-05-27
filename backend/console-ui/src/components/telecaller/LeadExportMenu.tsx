import { useState } from 'react';
import { openLeadExport, openWhatsAppShare, type ExportType } from '../../lib/crmExport';

type Props = {
  leadId: string;
  canShare?: boolean;
};

export function LeadExportMenu({ leadId, canShare = true }: Props) {
  const [open, setOpen] = useState(false);
  const [error, setError] = useState('');

  async function exportAs(type: ExportType) {
    setOpen(false);
    setError('');
    try {
      await openLeadExport(leadId, type);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Export failed');
    }
  }

  async function share() {
    setOpen(false);
    setError('');
    try {
      await openWhatsAppShare(leadId, { type: 'lead' });
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Share failed');
    }
  }

  return (
    <div className="relative">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-medium text-slate-700 hover:bg-slate-50"
      >
        Export / Share ▾
      </button>
      {open ? (
        <>
          <div className="fixed inset-0 z-10" onClick={() => setOpen(false)} aria-hidden />
          <div className="absolute right-0 z-20 mt-1 w-48 rounded-lg border border-slate-200 bg-white py-1 shadow-lg">
            <button
              type="button"
              className="block w-full px-3 py-2 text-left text-xs hover:bg-slate-50"
              onClick={() => exportAs('lead')}
            >
              Print farmer profile
            </button>
            <button
              type="button"
              className="block w-full px-3 py-2 text-left text-xs hover:bg-slate-50"
              onClick={() => exportAs('recommendations')}
            >
              Print recommendations
            </button>
            <button
              type="button"
              className="block w-full px-3 py-2 text-left text-xs hover:bg-slate-50"
              onClick={() => exportAs('interactions')}
            >
              Print interactions
            </button>
            <button
              type="button"
              className="block w-full px-3 py-2 text-left text-xs hover:bg-slate-50"
              onClick={() => exportAs('findings')}
            >
              Print field findings
            </button>
            {canShare ? (
              <>
                <hr className="my-1 border-slate-100" />
                <button
                  type="button"
                  className="block w-full px-3 py-2 text-left text-xs text-emerald-800 hover:bg-emerald-50"
                  onClick={share}
                >
                  Share on WhatsApp
                </button>
              </>
            ) : null}
          </div>
        </>
      ) : null}
      {error ? <p className="mt-1 text-xs text-red-600">{error}</p> : null}
    </div>
  );
}
