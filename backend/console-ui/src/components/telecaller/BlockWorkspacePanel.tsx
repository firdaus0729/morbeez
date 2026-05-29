import { useEffect, useState } from 'react';

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



type Props = {

  leadId: string;

  blockId: string;

  canWrite: boolean;

  onSaved: () => void;

};



export function BlockWorkspacePanel({ leadId, blockId, canWrite, onSaved }: Props) {

  const [loading, setLoading] = useState(true);

  const [saving, setSaving] = useState(false);

  const [savingSoil, setSavingSoil] = useState(false);

  const [showSoilForm, setShowSoilForm] = useState(false);

  const [error, setError] = useState('');

  const [blockInfo, setBlockInfo] = useState<BlockInfo | null>(null);

  const [soilReports, setSoilReports] = useState<SoilRow[]>([]);

  const [editBlock, setEditBlock] = useState<CropBlockFormValue>(emptyCropBlock());

  const [soilMacro, setSoilMacro] = useState(emptySoilForm().macro);

  const [soilMicro, setSoilMicro] = useState(emptySoilForm().micro);



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

    } catch (e) {

      setError(e instanceof Error ? e.message : 'Could not load block');

    } finally {

      setLoading(false);

    }

  }



  useEffect(() => {

    void load();

  }, [leadId, blockId]);



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

      onSaved();

    } catch (e) {

      setError(e instanceof Error ? e.message : 'Could not save block');

    } finally {

      setSaving(false);

    }

  }



  function openSoilForm() {

    const empty = emptySoilForm();

    setSoilMacro(empty.macro);

    setSoilMicro(empty.micro);

    setShowSoilForm(true);

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

      setShowSoilForm(false);

      await load();

      onSaved();

    } catch (e) {

      setError(e instanceof Error ? e.message : 'Could not save soil test');

    } finally {

      setSavingSoil(false);

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

          <div className="flex flex-wrap gap-2">

            <Btn type="button" variant="secondary" onClick={openSoilForm}>

              + Add soil test

            </Btn>

            <Btn type="button" disabled={saving} onClick={() => void saveBlock()}>

              {saving ? 'Saving…' : 'Save block'}

            </Btn>

          </div>

        ) : null}

      </div>



      {error ? <p className="mt-2 text-xs text-red-600">{error}</p> : null}



      {canWrite ? (

        <div className="mt-4">

          <CropBlockFields blocks={[editBlock]} onChange={(rows) => setEditBlock(rows[0] ?? emptyCropBlock())} />

        </div>

      ) : (

        <dl className="mt-3 grid gap-2 sm:grid-cols-2">

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

      )}



      {!canWrite ? null : (

        <dl className="mt-3 grid gap-2 border-t border-slate-100 pt-3 sm:grid-cols-2">

          <Row

            label="DAP"

            value={blockInfo?.daysAfterPlanting != null ? `${blockInfo.daysAfterPlanting} days` : '—'}

          />

          <Row label="Growth stage" value={blockInfo?.growthStage ?? '—'} />

        </dl>

      )}



      {showSoilForm && canWrite ? (

        <section className="mt-4 rounded-lg border border-emerald-200 bg-emerald-50/30 p-3">

          <div className="mb-3 flex items-center justify-between">

            <h4 className="text-sm font-medium text-slate-800">New soil test</h4>

            <button

              type="button"

              className="text-xs text-slate-500 hover:underline"

              onClick={() => setShowSoilForm(false)}

            >

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

            <Btn type="button" variant="secondary" onClick={() => setShowSoilForm(false)}>

              Cancel

            </Btn>

            <Btn type="button" disabled={savingSoil} onClick={() => void saveSoilTest()}>

              {savingSoil ? 'Saving…' : 'Save soil test'}

            </Btn>

          </div>

        </section>

      ) : null}



      <section className="mt-4 border-t border-slate-100 pt-3">

        <h4 className="text-xs font-semibold uppercase text-slate-500">Soil tests</h4>

        {soilReports.length === 0 ? (

          <p className="mt-2 text-xs text-slate-500">No soil tests yet — use Add soil test.</p>

        ) : (

          <ul className="mt-2 space-y-3">

            {soilReports.map((s) => (

              <li key={s.id} className="rounded border border-slate-100 bg-slate-50 px-3 py-2">

                <div className="flex flex-wrap items-center justify-between gap-2 text-xs">

                  <span className="font-medium text-slate-800">{s.reportedLabel ?? 'Soil report'}</span>

                  {s.pdfUrl ? (

                    <a className="text-emerald-700 hover:underline" href={s.pdfUrl} target="_blank" rel="noreferrer">

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

    </div>

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


