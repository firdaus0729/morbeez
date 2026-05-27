import { useEffect, useState } from 'react';
import { api } from '../../lib/api';
import { Field, Modal, inputClass } from '../Modal';
import { MasterSelect } from './MasterSelect';

const base = '/console/api/v1/os/telecaller';

export type CrmModalType =
  | 'block'
  | 'interaction'
  | 'recommendation'
  | 'finding'
  | 'order'
  | 'call'
  | 'task'
  | 'visit'
  | null;

type BlockOption = { id: string; name: string; cropName?: string };

type Props = {
  type: CrmModalType;
  leadId: string;
  blocks: BlockOption[];
  onClose: () => void;
  onSaved: () => void;
};

export function CrmModals({ type, leadId, blocks, onClose, onSaved }: Props) {
  if (!type) return null;

  if (type === 'block') return <AddBlockModal leadId={leadId} onClose={onClose} onSaved={onSaved} />;
  if (type === 'interaction')
    return <AddInteractionModal leadId={leadId} blocks={blocks} onClose={onClose} onSaved={onSaved} />;
  if (type === 'recommendation')
    return (
      <AddRecommendationModal leadId={leadId} blocks={blocks} onClose={onClose} onSaved={onSaved} />
    );
  if (type === 'finding')
    return <AddFieldFindingModal leadId={leadId} blocks={blocks} onClose={onClose} onSaved={onSaved} />;
  if (type === 'order')
    return <NewOrderModal leadId={leadId} blocks={blocks} onClose={onClose} onSaved={onSaved} />;
  if (type === 'call') return <LogCallModal leadId={leadId} onClose={onClose} onSaved={onSaved} />;
  if (type === 'task') return <AddTaskModal leadId={leadId} onClose={onClose} onSaved={onSaved} />;
  if (type === 'visit')
    return <ScheduleVisitModal leadId={leadId} blocks={blocks} onClose={onClose} onSaved={onSaved} />;
  return null;
}

function useSubmit(onSaved: () => void, onClose: () => void) {
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  async function run(fn: () => Promise<void>) {
    setSaving(true);
    setError('');
    try {
      await fn();
      onSaved();
      onClose();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed');
    } finally {
      setSaving(false);
    }
  }

  return { saving, error, run };
}

function AddBlockModal({
  leadId,
  onClose,
  onSaved,
}: {
  leadId: string;
  onClose: () => void;
  onSaved: () => void;
}) {
  const [name, setName] = useState('');
  const [area, setArea] = useState('');
  const [cropId, setCropId] = useState('');
  const [cropName, setCropName] = useState('');
  const [irrigationId, setIrrigationId] = useState('');
  const [soilId, setSoilId] = useState('');
  const [variety, setVariety] = useState('');
  const [plantingDate, setPlantingDate] = useState('');
  const { saving, error, run } = useSubmit(onSaved, onClose);

  return (
    <Modal
      title="Add farm block"
      onClose={onClose}
      saving={saving}
      onSave={() =>
        run(async () => {
          if (!name.trim()) throw new Error('Block name is required');
          if (!cropName.trim() && !cropId) throw new Error('Select a crop');
          await api(`${base}/leads/${leadId}/blocks`, {
            method: 'POST',
            body: JSON.stringify({
              name: name.trim(),
              area: area.trim() || undefined,
              cropId: cropId || undefined,
              cropName: cropName.trim() || undefined,
              varietyName: variety.trim() || undefined,
              irrigationTypeId: irrigationId || undefined,
              soilTypeId: soilId || undefined,
              plantingDate: plantingDate || undefined,
            }),
          });
        })
      }
    >
      {error ? <p className="mb-3 text-sm text-red-600">{error}</p> : null}
      <div className="grid gap-3 sm:grid-cols-2">
        <Field label="Block name">
          <input className={inputClass} value={name} onChange={(e) => setName(e.target.value)} required />
        </Field>
        <Field label="Area">
          <input className={inputClass} value={area} onChange={(e) => setArea(e.target.value)} placeholder="2.1 acre" />
        </Field>
        <MasterSelect
          masterType="crop"
          label="Crop"
          value={cropId}
          onChange={(id, n) => {
            setCropId(id);
            setCropName(n);
          }}
        />
        <Field label="Variety">
          <input className={inputClass} value={variety} onChange={(e) => setVariety(e.target.value)} />
        </Field>
        <MasterSelect
          masterType="irrigation_type"
          label="Irrigation"
          value={irrigationId}
          onChange={(id) => setIrrigationId(id)}
        />
        <MasterSelect
          masterType="soil_type"
          label="Soil type"
          value={soilId}
          onChange={(id) => setSoilId(id)}
        />
        <Field label="Planting date" className="sm:col-span-2">
          <input
            type="date"
            className={inputClass}
            value={plantingDate}
            onChange={(e) => setPlantingDate(e.target.value)}
          />
        </Field>
      </div>
    </Modal>
  );
}

function AddInteractionModal({
  leadId,
  blocks,
  onClose,
  onSaved,
}: {
  leadId: string;
  blocks: BlockOption[];
  onClose: () => void;
  onSaved: () => void;
}) {
  const [interactionTypeId, setInteractionTypeId] = useState('');
  const [interactionTypeName, setInteractionTypeName] = useState('');
  const [blockId, setBlockId] = useState('');
  const [notes, setNotes] = useState('');
  const [followUp, setFollowUp] = useState('');
  const { saving, error, run } = useSubmit(onSaved, onClose);

  return (
    <Modal
      title="Log interaction"
      onClose={onClose}
      saving={saving}
      onSave={() =>
        run(async () => {
          const typeLabel = interactionTypeName.trim() || 'Note';
          await api(`${base}/leads/${leadId}/interactions`, {
            method: 'POST',
            body: JSON.stringify({
              interactionType: typeLabel,
              blockId: blockId || undefined,
              notes: notes.trim(),
              nextActionAt: followUp || undefined,
              status: 'completed',
            }),
          });
        })
      }
    >
      {error ? <p className="mb-3 text-sm text-red-600">{error}</p> : null}
      <div className="space-y-3">
        <MasterSelect
          masterType="interaction_type"
          label="Interaction type"
          value={interactionTypeId}
          onChange={(id, n) => {
            setInteractionTypeId(id);
            setInteractionTypeName(n);
          }}
        />
        <Field label="Block">
          <select className={inputClass} value={blockId} onChange={(e) => setBlockId(e.target.value)}>
            <option value="">— None —</option>
            {blocks.map((b) => (
              <option key={b.id} value={b.id}>
                {b.name}
              </option>
            ))}
          </select>
        </Field>
        <Field label="Notes">
          <textarea className={inputClass} rows={3} value={notes} onChange={(e) => setNotes(e.target.value)} />
        </Field>
        <Field label="Next follow-up">
          <input
            type="datetime-local"
            className={inputClass}
            value={followUp}
            onChange={(e) => setFollowUp(e.target.value)}
          />
        </Field>
      </div>
    </Modal>
  );
}

function AddRecommendationModal({
  leadId,
  blocks,
  onClose,
  onSaved,
}: {
  leadId: string;
  blocks: BlockOption[];
  onClose: () => void;
  onSaved: () => void;
}) {
  const [blockId, setBlockId] = useState('');
  const [problem, setProblem] = useState('');
  const [text, setText] = useState('');
  const [dosage, setDosage] = useState('');
  const [methodId, setMethodId] = useState('');
  const [methodName, setMethodName] = useState('');
  const { saving, error, run } = useSubmit(onSaved, onClose);

  return (
    <Modal
      title="Add recommendation"
      onClose={onClose}
      saving={saving}
      onSave={() =>
        run(async () => {
          if (!text.trim()) throw new Error('Recommendation text is required');
          await api(`${base}/leads/${leadId}/recommendations`, {
            method: 'POST',
            body: JSON.stringify({
              blockId: blockId || undefined,
              problem: problem.trim() || undefined,
              recommendation: text.trim(),
              dosage: dosage.trim() || undefined,
              applicationMethod: methodName.trim() || undefined,
              recType: 'agronomist',
            }),
          });
        })
      }
    >
      {error ? <p className="mb-3 text-sm text-red-600">{error}</p> : null}
      <div className="space-y-3">
        <Field label="Block">
          <select className={inputClass} value={blockId} onChange={(e) => setBlockId(e.target.value)}>
            <option value="">— None —</option>
            {blocks.map((b) => (
              <option key={b.id} value={b.id}>
                {b.name}
              </option>
            ))}
          </select>
        </Field>
        <Field label="Problem / need">
          <input className={inputClass} value={problem} onChange={(e) => setProblem(e.target.value)} />
        </Field>
        <Field label="Recommendation">
          <textarea className={inputClass} rows={3} value={text} onChange={(e) => setText(e.target.value)} />
        </Field>
        <Field label="Dosage">
          <input className={inputClass} value={dosage} onChange={(e) => setDosage(e.target.value)} />
        </Field>
        <MasterSelect
          masterType="application_method"
          label="Application method"
          value={methodId}
          onChange={(id, n) => {
            setMethodId(id);
            setMethodName(n);
          }}
        />
      </div>
    </Modal>
  );
}

function AddFieldFindingModal({
  leadId,
  blocks,
  onClose,
  onSaved,
}: {
  leadId: string;
  blocks: BlockOption[];
  onClose: () => void;
  onSaved: () => void;
}) {
  const [blockId, setBlockId] = useState(blocks[0]?.id ?? '');
  const [diseaseId, setDiseaseId] = useState('');
  const [diseaseName, setDiseaseName] = useState('');
  const [observations, setObservations] = useState('');
  const { saving, error, run } = useSubmit(onSaved, onClose);

  const block = blocks.find((b) => b.id === blockId);
  const disease = diseaseName.trim();

  return (
    <Modal
      title="Add field finding"
      onClose={onClose}
      saving={saving}
      onSave={() =>
        run(async () => {
          if (!block) throw new Error('Select a block');
          await api(`${base}/leads/${leadId}/field-findings`, {
            method: 'POST',
            body: JSON.stringify({
              blockId: block.id,
              blockName: block.name,
              cropType: block.cropName ?? '—',
              diseasePest: disease || 'Pending review',
              diseaseTone: disease.toLowerCase().includes('healthy') ? 'healthy' : 'warning',
              observations: observations.trim() || undefined,
            }),
          });
        })
      }
    >
      {error ? <p className="mb-3 text-sm text-red-600">{error}</p> : null}
      <div className="space-y-3">
        <Field label="Block">
          <select className={inputClass} value={blockId} onChange={(e) => setBlockId(e.target.value)}>
            {blocks.map((b) => (
              <option key={b.id} value={b.id}>
                {b.name} — {b.cropName ?? 'crop'}
              </option>
            ))}
          </select>
        </Field>
        <MasterSelect
          masterType="disease"
          label="Disease / pest"
          value={diseaseId}
          onChange={(id, n) => {
            setDiseaseId(id);
            setDiseaseName(n);
          }}
        />
        <Field label="Observations">
          <textarea className={inputClass} rows={3} value={observations} onChange={(e) => setObservations(e.target.value)} />
        </Field>
      </div>
    </Modal>
  );
}

type CatalogItem = { variantId?: number; title: string; price: number };

function NewOrderModal({
  leadId,
  blocks,
  onClose,
  onSaved,
}: {
  leadId: string;
  blocks: BlockOption[];
  onClose: () => void;
  onSaved: () => void;
}) {
  const [catalog, setCatalog] = useState<CatalogItem[]>([]);
  const [variantKey, setVariantKey] = useState('');
  const [title, setTitle] = useState('');
  const [qty, setQty] = useState('1');
  const [price, setPrice] = useState('');
  const [blockId, setBlockId] = useState('');
  const [address, setAddress] = useState('');
  const [paymentId, setPaymentId] = useState('');
  const [paymentName, setPaymentName] = useState('');
  const { saving, error, run } = useSubmit(onSaved, onClose);

  useEffect(() => {
    api<{ ok: boolean; items: CatalogItem[] }>(`${base}/orders/catalog`)
      .then((d) => setCatalog(d.items ?? []))
      .catch(() => setCatalog([]));
  }, []);

  useEffect(() => {
    const item = catalog.find((c) => String(c.variantId) === variantKey);
    if (item) {
      setTitle(item.title);
      setPrice(String(item.price));
    }
  }, [variantKey, catalog]);

  return (
    <Modal
      title="New order"
      onClose={onClose}
      saving={saving}
      onSave={() =>
        run(async () => {
          const lineTitle = title.trim() || 'Product';
          const unitPrice = Number(price) || 0;
          const quantity = Number(qty) || 1;
          await api(`${base}/leads/${leadId}/orders`, {
            method: 'POST',
            body: JSON.stringify({
              blockId: blockId || undefined,
              lineItems: [
                {
                  variantId: variantKey ? Number(variantKey) : undefined,
                  title: lineTitle,
                  quantity,
                  price: unitPrice,
                },
              ],
              paymentMode: paymentName.trim() || undefined,
              deliveryAddress: address.trim() || undefined,
            }),
          });
        })
      }
    >
      {error ? <p className="mb-3 text-sm text-red-600">{error}</p> : null}
      <div className="space-y-3">
        {catalog.length > 0 ? (
          <Field label="Catalog product">
            <select className={inputClass} value={variantKey} onChange={(e) => setVariantKey(e.target.value)}>
              <option value="">Custom</option>
              {catalog.map((c) => (
                <option key={String(c.variantId)} value={String(c.variantId)}>
                  {c.title} — ₹{c.price}
                </option>
              ))}
            </select>
          </Field>
        ) : null}
        <Field label="Product title">
          <input className={inputClass} value={title} onChange={(e) => setTitle(e.target.value)} />
        </Field>
        <div className="grid grid-cols-2 gap-3">
          <Field label="Qty">
            <input type="number" min={1} className={inputClass} value={qty} onChange={(e) => setQty(e.target.value)} />
          </Field>
          <Field label="Unit price (₹)">
            <input
              type="number"
              min={0}
              step="0.01"
              className={inputClass}
              value={price}
              onChange={(e) => setPrice(e.target.value)}
            />
          </Field>
        </div>
        <Field label="Block">
          <select className={inputClass} value={blockId} onChange={(e) => setBlockId(e.target.value)}>
            <option value="">—</option>
            {blocks.map((b) => (
              <option key={b.id} value={b.id}>
                {b.name}
              </option>
            ))}
          </select>
        </Field>
        <MasterSelect
          masterType="payment_mode"
          label="Payment mode"
          value={paymentId}
          onChange={(id, n) => {
            setPaymentId(id);
            setPaymentName(n);
          }}
        />
        <Field label="Delivery address">
          <textarea className={inputClass} rows={2} value={address} onChange={(e) => setAddress(e.target.value)} />
        </Field>
      </div>
    </Modal>
  );
}

function LogCallModal({
  leadId,
  onClose,
  onSaved,
}: {
  leadId: string;
  onClose: () => void;
  onSaved: () => void;
}) {
  const [outcome, setOutcome] = useState('answered');
  const [notes, setNotes] = useState('');
  const { saving, error, run } = useSubmit(onSaved, onClose);

  return (
    <Modal
      title="Log call"
      onClose={onClose}
      saving={saving}
      onSave={() =>
        run(async () => {
          await api(`${base}/leads/${leadId}/calls`, {
            method: 'POST',
            body: JSON.stringify({ outcome, notes: notes.trim() || undefined }),
          });
        })
      }
    >
      {error ? <p className="mb-3 text-sm text-red-600">{error}</p> : null}
      <div className="space-y-3">
        <Field label="Outcome">
          <select className={inputClass} value={outcome} onChange={(e) => setOutcome(e.target.value)}>
            {['answered', 'no_answer', 'busy', 'callback_requested'].map((o) => (
              <option key={o} value={o}>
                {o.replace(/_/g, ' ')}
              </option>
            ))}
          </select>
        </Field>
        <Field label="Notes">
          <textarea className={inputClass} rows={3} value={notes} onChange={(e) => setNotes(e.target.value)} />
        </Field>
      </div>
    </Modal>
  );
}

function AddTaskModal({
  leadId,
  onClose,
  onSaved,
}: {
  leadId: string;
  onClose: () => void;
  onSaved: () => void;
}) {
  const [title, setTitle] = useState('Follow-up call');
  const [dueAt, setDueAt] = useState('');
  const [notes, setNotes] = useState('');
  const { saving, error, run } = useSubmit(onSaved, onClose);

  return (
    <Modal
      title="Schedule follow-up"
      onClose={onClose}
      saving={saving}
      onSave={() =>
        run(async () => {
          await api(`${base}/leads/${leadId}/tasks`, {
            method: 'POST',
            body: JSON.stringify({
              title: title.trim(),
              dueAt: dueAt ? new Date(dueAt).toISOString() : undefined,
              notes: notes.trim() || undefined,
              taskType: 'follow_up',
            }),
          });
        })
      }
    >
      {error ? <p className="mb-3 text-sm text-red-600">{error}</p> : null}
      <div className="space-y-3">
        <Field label="Title">
          <input className={inputClass} value={title} onChange={(e) => setTitle(e.target.value)} />
        </Field>
        <Field label="Due">
          <input
            type="datetime-local"
            className={inputClass}
            value={dueAt}
            onChange={(e) => setDueAt(e.target.value)}
          />
        </Field>
        <Field label="Notes">
          <textarea className={inputClass} rows={2} value={notes} onChange={(e) => setNotes(e.target.value)} />
        </Field>
      </div>
    </Modal>
  );
}

function ScheduleVisitModal({
  leadId,
  blocks,
  onClose,
  onSaved,
}: {
  leadId: string;
  blocks: BlockOption[];
  onClose: () => void;
  onSaved: () => void;
}) {
  const defaultDue = new Date(Date.now() + 2 * 86400000);
  defaultDue.setMinutes(0, 0, 0);
  const [title, setTitle] = useState('Field visit');
  const [dueAt, setDueAt] = useState(defaultDue.toISOString().slice(0, 16));
  const [blockId, setBlockId] = useState('');
  const [notes, setNotes] = useState('');
  const { saving, error, run } = useSubmit(onSaved, onClose);

  return (
    <Modal
      title="Schedule field visit"
      onClose={onClose}
      saving={saving}
      onSave={() =>
        run(async () => {
          await api(`${base}/leads/${leadId}/schedule-visit`, {
            method: 'POST',
            body: JSON.stringify({
              title: title.trim(),
              dueAt: new Date(dueAt).toISOString(),
              blockId: blockId || undefined,
              notes: notes.trim() || undefined,
            }),
          });
        })
      }
    >
      {error ? <p className="mb-3 text-sm text-red-600">{error}</p> : null}
      <div className="space-y-3">
        <Field label="Title">
          <input className={inputClass} value={title} onChange={(e) => setTitle(e.target.value)} />
        </Field>
        <Field label="Date & time">
          <input
            type="datetime-local"
            className={inputClass}
            value={dueAt}
            onChange={(e) => setDueAt(e.target.value)}
          />
        </Field>
        <Field label="Block">
          <select className={inputClass} value={blockId} onChange={(e) => setBlockId(e.target.value)}>
            <option value="">—</option>
            {blocks.map((b) => (
              <option key={b.id} value={b.id}>
                {b.name}
              </option>
            ))}
          </select>
        </Field>
        <Field label="Notes">
          <textarea className={inputClass} rows={2} value={notes} onChange={(e) => setNotes(e.target.value)} />
        </Field>
      </div>
    </Modal>
  );
}
