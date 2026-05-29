import { useEffect, useRef, useState, type FormEvent } from 'react';
import { api } from '../../lib/api';
import { Btn } from '../ui';
import {
  CropBlockFields,
  blockFromApi,
  cropNameFromBlock,
  emptyCropBlock,
  toApiCropBlock,
  type CropBlockFormValue,
} from './CropBlockFields';
import { SoilTestForm, SoilTestReadout } from './SoilTestForm';
import { emptySoilForm, formToMetricsPayload, type SoilLabMetrics } from './soilLabMetrics';

const base = '/morbeez-staff/api/v1/os/telecaller';

type BlockInfo = {
  blockName?: string;
  area?: string;
  crop?: string;
  plantingDate?: string | null;
  daysAfterPlanting?: number | null;
  growthStage?: string;
};

type SoilRow = {
  id: string;
  reportedLabel?: string | null;
  metrics?: SoilLabMetrics;
  pdfUrl?: string | null;
};

type NoteRow = {
  id: string;
  note?: string;
  content?: string;
  created_at?: string;
  created_by?: string;
};

type PanelMode = 'view' | 'edit' | 'soil' | 'notes';

type Props = {
  leadId: string;
  blockId: string;
  canWrite: boolean;
  onSaved: () => void;
};

function blockNoteTag(blockName: string): string {
  return `[Block: ${blockName}]`;
}

export function BlockWorkspacePanel({ leadId, blockId, canWrite, onSaved }: Props) {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [savingSoil, setSavingSoil] = useState(false);
  const [savingNote, setSavingNote] = useState(false);
  const [panelMode, setPanelMode] = useState<PanelMode>('view');
  const [menuOpen, setMenuOpen] = useState(false);
  const [error, setError] = useState('');
  const [blockInfo, setBlockInfo] = useState<BlockInfo | null>(null);
  const [soilReports, setSoilReports] = useState<SoilRow[]>([]);
  const [editBlock, setEditBlock] = useState<CropBlockFormValue>(emptyCropBlock());
  const [soilMacro, setSoilMacro] = useState(emptySoilForm().macro);
  const [soilMicro, setSoilMicro] = useState(emptySoilForm().micro);
  const [blockNotes, setBlockNotes] = useState<NoteRow[]>([]);
  const [noteText, setNoteText] = useState('');
  const menuRef = useRef<HTMLDivElement>(null);

  const blockLabel = blockInfo?.blockName ?? editBlock.blockName ?? 'Block';

  async function loadNotes(tag: string) {
    try {
      const r = await api<{ ok: boolean; notes: NoteRow[] }>(`${base}/leads/${leadId}/notes`);
      const tagLower = tag.toLowerCase();
      setBlockNotes(
        (r.notes ?? []).filter((n) => {
          const text = String(n.note ?? n.content ?? '').toLowerCase();
          return text.includes(tagLower);
        })
      );
    } catch {
      setBlockNotes([]);
    }
  }

  async function load() {
    setLoading(true);
    setError('');
    try {
      const ws = await api<{
        ok: boolean;
        blockInfo?: BlockInfo;
        block?: { id: string; name: string; cropName?: string; area?: string; plantingDate?: string | null };
        soilReports?: SoilRow[];
      }>(`${base}/leads/${leadId}/blocks/${blockId}/workspace`);
      setBlockInfo(ws.blockInfo ?? null);
      setSoilReports(ws.soilReports ?? []);
      const src = ws.block ?? {
        id: blockId,
        name: ws.blockInfo?.blockName ?? '',
        cropName: ws.blockInfo?.crop ?? '',
        area: ws.blockInfo?.area,
        plantingDate: ws.blockInfo?.plantingDate,
      };
      setEditBlock(
        blockFromApi({
          id: src.id,
          blockName: src.name,
          cropName: src.cropName ?? ws.blockInfo?.crop ?? '',
          acreage: src.area,
          plantingDate: src.plantingDate,
        })
      );
      const label = src.name || ws.blockInfo?.blockName || 'Block';
      await loadNotes(blockNoteTag(label));
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not load block');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    setPanelMode('view');
    void load();
  }, [leadId, blockId]);

  useEffect(() => {
    function onDocClick(e: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setMenuOpen(false);
      }
    }
    document.addEventListener('mousedown', onDocClick);
    return () => document.removeEventListener('mousedown', onDocClick);
  }, []);

  function openMode(mode: PanelMode) {
    setMenuOpen(false);
    setError('');
    if (mode === 'soil') {
      const empty = emptySoilForm();
      setSoilMacro(empty.macro);
      setSoilMicro(empty.micro);
    }
    if (mode === 'notes') {
      void loadNotes(blockNoteTag(blockLabel));
    }
    if (mode === 'edit') {
      setEditBlock(
        blockFromApi({
          id: blockId,
          blockName: blockInfo?.blockName ?? editBlock.blockName,
          cropName: blockInfo?.crop ?? cropNameFromBlock(editBlock),
          acreage: blockInfo?.area,
          plantingDate: blockInfo?.plantingDate,
        })
      );
    }
    setPanelMode(mode);
  }

  function closePanel() {
    setPanelMode('view');
    setError('');
  }

  async function saveBlock() {
    const payload = toApiCropBlock(editBlock);
    if (!payload) {
      setError('Select a crop for this block');
      return;
    }
    setSaving(true);
    setError('');
    try {
      await api(`${base}/leads/${leadId}/blocks/${blockId}`, {
        method: 'PATCH',
        body: JSON.stringify({
          name: payload.blockName,
          cropName: payload.cropName,
          area: payload.acreage != null ? String(payload.acreage) : undefined,
          plantingDate: payload.plantingDate,
        }),
      });
      await load();
      setPanelMode('view');
      onSaved();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not save block');
    } finally {
      setSaving(false);
    }
  }

  async function saveSoilTest() {
    const metrics = formToMetricsPayload(soilMacro, soilMicro);
    const hasValue =
      Object.values(metrics.macro).some((m) => m.value) ||
      Object.values(metrics.micro).some((m) => m.value);
    if (!hasValue) {
      setError('Enter at least one soil test value');
      return;
    }
    setSavingSoil(true);
    setError('');
    try {
      await api(`${base}/leads/${leadId}/soil-reports`, {
        method: 'POST',
        body: JSON.stringify({ blockId, metrics }),
      });
      setPanelMode('view');
      await load();
      onSaved();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not save soil test');
    } finally {
      setSavingSoil(false);
    }
  }

  async function saveBlockNote(e: FormEvent) {
    e.preventDefault();
    if (!noteText.trim()) return;
    setSavingNote(true);
    setError('');
    try {
      const body = `${blockNoteTag(blockLabel)} ${noteText.trim()}`;
      await api(`${base}/leads/${leadId}/notes`, {
        method: 'POST',
        body: JSON.stringify({ note: body }),
      });
      setNoteText('');
      await loadNotes(blockNoteTag(blockLabel));
      onSaved();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not save note');
    } finally {
      setSavingNote(false);
    }
  }

  if (loading) {
    return <p className="text-sm text-slate-500">Loading block…</p>;
  }

  const displayCrop = blockInfo?.crop ?? cropNameFromBlock(editBlock);

  return (
    <div className="rounded-xl border border-slate-200 bg-white p-4 text-sm shadow-sm">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h3 className="font-medium">Block workspace</h3>
        {canWrite ? (
          <div className="relative" ref={menuRef}>
            <Btn
              type="button"
              variant="secondary"
              onClick={() => setMenuOpen((o) => !o)}
              aria-expanded={menuOpen}
            >
              Actions ▾
            </Btn>
            {menuOpen ? (
              <div className="absolute right-0 z-20 mt-1 min-w-[10rem] rounded-lg border border-slate-200 bg-white py-1 shadow-lg">
                <MenuItem label="Edit" onClick={() => openMode('edit')} />
                <MenuItem label="Add soil test" onClick={() => openMode('soil')} />
                <MenuItem label="Notes" onClick={() => openMode('notes')} />
              </div>
            ) : null}
          </div>
        ) : null}
      </div>

      {error ? <p className="mt-2 text-xs text-red-600">{error}</p> : null}

      {panelMode === 'view' ? (
        <dl className="mt-4 grid gap-3 sm:grid-cols-2">
          <Row label="Block name" value={blockInfo?.blockName ?? '—'} />
          <Row label="Crop" value={displayCrop ?? '—'} />
          <Row label="Acre" value={blockInfo?.area ?? '—'} />
          <Row
            label="Planted date"
            value={blockInfo?.plantingDate ? String(blockInfo.plantingDate).slice(0, 10) : '—'}
          />
          <Row
            label="DAP"
            value={blockInfo?.daysAfterPlanting != null ? `${blockInfo.daysAfterPlanting} days` : '—'}
          />
          <Row label="Growth stage" value={blockInfo?.growthStage ?? '—'} />
        </dl>
      ) : null}

      {panelMode === 'edit' ? (
        <section className="mt-4 rounded-lg border border-slate-200 bg-slate-50/50 p-3">
          <div className="mb-3 flex items-center justify-between">
            <h4 className="text-sm font-medium text-slate-800">Edit block</h4>
            <button type="button" className="text-xs text-slate-500 hover:underline" onClick={closePanel}>
              Cancel
            </button>
          </div>
          <CropBlockFields blocks={[editBlock]} onChange={(rows) => setEditBlock(rows[0] ?? emptyCropBlock())} />
          <div className="mt-3 flex justify-end gap-2">
            <Btn type="button" variant="secondary" onClick={closePanel}>
              Cancel
            </Btn>
            <Btn type="button" disabled={saving} onClick={() => void saveBlock()}>
              {saving ? 'Saving…' : 'Save block'}
            </Btn>
          </div>
        </section>
      ) : null}

      {panelMode === 'soil' ? (
        <section className="mt-4 rounded-lg border border-emerald-200 bg-emerald-50/30 p-3">
          <div className="mb-3 flex items-center justify-between">
            <h4 className="text-sm font-medium text-slate-800">New soil test</h4>
            <button type="button" className="text-xs text-slate-500 hover:underline" onClick={closePanel}>
              Cancel
            </button>
          </div>
          <SoilTestForm
            macro={soilMacro}
            micro={soilMicro}
            onMacroChange={setSoilMacro}
            onMicroChange={setSoilMicro}
            disabled={savingSoil}
          />
          <div className="mt-3 flex justify-end gap-2">
            <Btn type="button" variant="secondary" onClick={closePanel}>
              Cancel
            </Btn>
            <Btn type="button" disabled={savingSoil} onClick={() => void saveSoilTest()}>
              {savingSoil ? 'Saving…' : 'Save soil test'}
            </Btn>
          </div>
        </section>
      ) : null}

      {panelMode === 'notes' ? (
        <section className="mt-4 rounded-lg border border-slate-200 bg-slate-50/50 p-3">
          <div className="mb-3 flex items-center justify-between">
            <h4 className="text-sm font-medium text-slate-800">Block notes — {blockLabel}</h4>
            <button type="button" className="text-xs text-slate-500 hover:underline" onClick={closePanel}>
              Close
            </button>
          </div>
          <ul className="mb-3 max-h-40 space-y-2 overflow-y-auto">
            {blockNotes.map((n) => (
              <li key={n.id} className="rounded border border-slate-100 bg-white px-2 py-1.5 text-xs">
                <div className="text-slate-400">
                  {String(n.created_at ?? '—')} · {String(n.created_by ?? 'staff')}
                </div>
                <div className="text-slate-800">
                  {String(n.note ?? n.content ?? '—').replace(blockNoteTag(blockLabel), '').trim() || '—'}
                </div>
              </li>
            ))}
            {blockNotes.length === 0 ? (
              <li className="text-xs text-slate-500">No notes for this block yet.</li>
            ) : null}
          </ul>
          <form onSubmit={saveBlockNote}>
            <textarea
              className="w-full rounded-lg border border-slate-200 px-2 py-1.5 text-sm"
              rows={3}
              value={noteText}
              onChange={(e) => setNoteText(e.target.value)}
              placeholder="Add a note for this block…"
            />
            <div className="mt-2 flex justify-end gap-2">
              <Btn type="button" variant="secondary" onClick={closePanel}>
                Close
              </Btn>
              <Btn type="submit" disabled={savingNote || !noteText.trim()}>
                {savingNote ? 'Saving…' : 'Save note'}
              </Btn>
            </div>
          </form>
        </section>
      ) : null}

      {panelMode === 'view' ? (
        <section className="mt-4 border-t border-slate-100 pt-3">
          <h4 className="text-xs font-semibold uppercase text-slate-500">Soil tests</h4>
          {soilReports.length === 0 ? (
            <p className="mt-2 text-xs text-slate-500">
              No soil tests yet — use Actions → Add soil test.
            </p>
          ) : (
            <ul className="mt-2 space-y-3">
              {soilReports.map((s) => (
                <li key={s.id} className="rounded border border-slate-100 bg-slate-50 px-3 py-2">
                  <div className="flex flex-wrap items-center justify-between gap-2 text-xs">
                    <span className="font-medium text-slate-800">{s.reportedLabel ?? 'Soil report'}</span>
                    {s.pdfUrl ? (
                      <a
                        className="text-emerald-700 hover:underline"
                        href={s.pdfUrl}
                        target="_blank"
                        rel="noreferrer"
                      >
                        PDF
                      </a>
                    ) : null}
                  </div>
                  {s.metrics?.macro ? (
                    <div className="mt-2">
                      <SoilTestReadout metrics={s.metrics} />
                    </div>
                  ) : null}
                </li>
              ))}
            </ul>
          )}
        </section>
      ) : null}
    </div>
  );
}

function MenuItem({ label, onClick }: { label: string; onClick: () => void }) {
  return (
    <button
      type="button"
      className="block w-full px-3 py-2 text-left text-sm text-slate-700 hover:bg-slate-50"
      onClick={onClick}
    >
      {label}
    </button>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <dt className="text-xs text-slate-500">{label}</dt>
      <dd className="font-medium text-slate-800">{value}</dd>
    </div>
  );
}
