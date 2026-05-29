import { useEffect, useState } from 'react';
import { api } from '../../lib/api';
import { Field, Modal, inputClass } from '../Modal';

const base = '/morbeez-staff/api/v1/os/telecaller';
const LANGS = [
  { id: 'en', label: 'English' },
  { id: 'ml', label: 'Malayalam' },
  { id: 'ta', label: 'Tamil' },
  { id: 'kn', label: 'Kannada' },
  { id: 'hi', label: 'Hindi' },
];

type CropBlock = { cropName: string; acreage: string; plantingDate: string };

type Props = {
  leadId: string;
  onClose: () => void;
  onSaved: () => void;
};

export function EditFarmerModal({ leadId, onClose, onSaved }: Props) {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [name, setName] = useState('');
  const [whatsappSame, setWhatsappSame] = useState(true);
  const [whatsappPhone, setWhatsappPhone] = useState('');
  const [language, setLanguage] = useState('en');
  const [pincode, setPincode] = useState('');
  const [district, setDistrict] = useState('');
  const [state, setState] = useState('');
  const [village, setVillage] = useState('');
  const [totalAcreage, setTotalAcreage] = useState('');
  const [shippingAddress, setShippingAddress] = useState('');
  const [deliveryPincode, setDeliveryPincode] = useState('');
  const [assignedCropAdvisor, setAssignedCropAdvisor] = useState('');
  const [roiEnabled, setRoiEnabled] = useState(false);
  const [farmerNotes, setFarmerNotes] = useState('');
  const [cropBlocks, setCropBlocks] = useState<CropBlock[]>([]);
  const [newCrops, setNewCrops] = useState<CropBlock[]>([{ cropName: '', acreage: '', plantingDate: '' }]);

  useEffect(() => {
    void (async () => {
      try {
        const res = await api<{
          ok: boolean;
          profile: {
            name: string | null;
            whatsappSame: boolean;
            whatsappPhone: string | null;
            language: string;
            pincode: string | null;
            district: string | null;
            state: string | null;
            village: string | null;
            totalAcreage: number | null;
            shippingAddress: string | null;
            deliveryPincode: string | null;
            assignedCropAdvisor: string | null;
            roiEnabled: boolean;
            farmerNotes: string | null;
          };
          cropBlocks: Array<{ cropName: string; acreage: string; plantingDate: string | null; daysAfterPlanting: number | null }>;
        }>(`${base}/leads/${leadId}/farmer-profile`);
        const p = res.profile;
        setName(p.name ?? '');
        setWhatsappSame(p.whatsappSame);
        setWhatsappPhone(p.whatsappPhone ?? '');
        setLanguage(p.language ?? 'en');
        setPincode(p.pincode ?? '');
        setDistrict(p.district ?? '');
        setState(p.state ?? '');
        setVillage(p.village ?? '');
        setTotalAcreage(p.totalAcreage != null ? String(p.totalAcreage) : '');
        setShippingAddress(p.shippingAddress ?? '');
        setDeliveryPincode(p.deliveryPincode ?? '');
        setAssignedCropAdvisor(p.assignedCropAdvisor ?? '');
        setRoiEnabled(p.roiEnabled);
        setFarmerNotes(p.farmerNotes ?? '');
        setCropBlocks(
          (res.cropBlocks ?? []).map((b) => ({
            cropName: b.cropName,
            acreage: String(b.acreage ?? ''),
            plantingDate: b.plantingDate ?? '',
          }))
        );
      } catch (e) {
        setError(e instanceof Error ? e.message : 'Could not load profile');
      } finally {
        setLoading(false);
      }
    })();
  }, [leadId]);

  async function lookupPincode(pc: string) {
    if (pc.replace(/\D/g, '').length !== 6) return;
    try {
      const res = await api<{ ok: boolean; pincode: { district: string; state: string } }>(
        `${base}/pincodes/${pc.replace(/\D/g, '')}`
      );
      setDistrict(res.pincode.district);
      setState(res.pincode.state);
    } catch {
      /* optional */
    }
  }

  async function save() {
    setSaving(true);
    setError('');
    try {
      const blocks = newCrops
        .filter((c) => c.cropName.trim())
        .map((c) => ({
          cropName: c.cropName.trim(),
          acreage: c.acreage.trim() ? Number(c.acreage) : undefined,
          plantingDate: c.plantingDate || undefined,
        }));
      await api(`${base}/leads/${leadId}/farmer-profile`, {
        method: 'PATCH',
        body: JSON.stringify({
          name: name.trim() || undefined,
          whatsappSame,
          whatsappPhone: whatsappSame ? undefined : whatsappPhone.trim(),
          language,
          pincode: pincode.trim() || undefined,
          village: village.trim() || undefined,
          totalAcreage: totalAcreage.trim() ? Number(totalAcreage) : undefined,
          shippingAddress: shippingAddress.trim() || undefined,
          deliveryPincode: deliveryPincode.trim() || undefined,
          assignedCropAdvisor: assignedCropAdvisor.trim() || undefined,
          roiEnabled,
          farmerNotes: farmerNotes.trim() || undefined,
          cropBlocks: blocks.length ? blocks : undefined,
        }),
      });
      onSaved();
      onClose();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not save');
    } finally {
      setSaving(false);
    }
  }

  return (
    <Modal title="Edit farmer profile" onClose={onClose} onSave={save} saving={saving || loading}>
      {error ? <p className="mb-3 text-sm text-red-600">{error}</p> : null}
      {loading ? (
        <p className="text-sm text-slate-500">Loading…</p>
      ) : (
        <div className="max-h-[70vh] space-y-4 overflow-y-auto pr-1">
          <section>
            <h4 className="mb-2 text-xs font-semibold uppercase text-slate-500">Basic details</h4>
            <div className="grid gap-3 sm:grid-cols-2">
              <Field label="Farmer name" className="sm:col-span-2">
                <input className={inputClass} value={name} onChange={(e) => setName(e.target.value)} />
              </Field>
              <Field label="Language">
                <select className={inputClass} value={language} onChange={(e) => setLanguage(e.target.value)}>
                  {LANGS.map((l) => (
                    <option key={l.id} value={l.id}>
                      {l.label}
                    </option>
                  ))}
                </select>
              </Field>
              <Field label="Pincode">
                <input
                  className={inputClass}
                  value={pincode}
                  onChange={(e) => setPincode(e.target.value)}
                  onBlur={() => void lookupPincode(pincode)}
                  maxLength={6}
                />
              </Field>
              <Field label="District">
                <input className={inputClass} value={district} readOnly />
              </Field>
              <Field label="State">
                <input className={inputClass} value={state} readOnly />
              </Field>
              <label className="flex items-center gap-2 text-sm sm:col-span-2">
                <input type="checkbox" checked={whatsappSame} onChange={(e) => setWhatsappSame(e.target.checked)} />
                WhatsApp same as mobile
              </label>
              {!whatsappSame ? (
                <Field label="WhatsApp number" className="sm:col-span-2">
                  <input className={inputClass} value={whatsappPhone} onChange={(e) => setWhatsappPhone(e.target.value)} />
                </Field>
              ) : null}
            </div>
          </section>

          <section>
            <h4 className="mb-2 text-xs font-semibold uppercase text-slate-500">Farm details</h4>
            <div className="grid gap-3 sm:grid-cols-2">
              <Field label="Village">
                <input className={inputClass} value={village} onChange={(e) => setVillage(e.target.value)} />
              </Field>
              <Field label="Total acreage">
                <input className={inputClass} value={totalAcreage} onChange={(e) => setTotalAcreage(e.target.value)} />
              </Field>
            </div>
            {cropBlocks.length > 0 ? (
              <ul className="mt-2 text-xs text-slate-600">
                {cropBlocks.map((b, i) => (
                  <li key={`${b.cropName}-${i}`}>
                    {b.cropName} — {b.acreage || '—'} acre — planted {b.plantingDate || '—'}
                  </li>
                ))}
              </ul>
            ) : null}
            <p className="mt-2 text-xs text-slate-500">Add new crop blocks</p>
            {newCrops.map((c, idx) => (
              <div key={idx} className="mt-2 grid gap-2 rounded border border-slate-100 p-2 sm:grid-cols-3">
                <input
                  className={inputClass}
                  placeholder="Crop name"
                  value={c.cropName}
                  onChange={(e) => {
                    const next = [...newCrops];
                    next[idx] = { ...next[idx], cropName: e.target.value };
                    setNewCrops(next);
                  }}
                />
                <input
                  className={inputClass}
                  placeholder="Acreage"
                  value={c.acreage}
                  onChange={(e) => {
                    const next = [...newCrops];
                    next[idx] = { ...next[idx], acreage: e.target.value };
                    setNewCrops(next);
                  }}
                />
                <input
                  type="date"
                  className={inputClass}
                  value={c.plantingDate}
                  onChange={(e) => {
                    const next = [...newCrops];
                    next[idx] = { ...next[idx], plantingDate: e.target.value };
                    setNewCrops(next);
                  }}
                />
              </div>
            ))}
            <button
              type="button"
              className="mt-2 text-xs text-emerald-700"
              onClick={() => setNewCrops([...newCrops, { cropName: '', acreage: '', plantingDate: '' }])}
            >
              + Add crop block
            </button>
          </section>

          <section>
            <h4 className="mb-2 text-xs font-semibold uppercase text-slate-500">Shipping</h4>
            <div className="grid gap-3 sm:grid-cols-2">
              <Field label="Shipping address" className="sm:col-span-2">
                <textarea
                  className={inputClass}
                  rows={2}
                  value={shippingAddress}
                  onChange={(e) => setShippingAddress(e.target.value)}
                />
              </Field>
              <Field label="Delivery pincode">
                <input className={inputClass} value={deliveryPincode} onChange={(e) => setDeliveryPincode(e.target.value)} />
              </Field>
            </div>
          </section>

          <section>
            <h4 className="mb-2 text-xs font-semibold uppercase text-slate-500">Assignment & optional</h4>
            <div className="grid gap-3 sm:grid-cols-2">
              <Field label="Assigned crop advisor (email)">
                <input className={inputClass} value={assignedCropAdvisor} onChange={(e) => setAssignedCropAdvisor(e.target.value)} />
              </Field>
              <label className="flex items-center gap-2 text-sm">
                <input type="checkbox" checked={roiEnabled} onChange={(e) => setRoiEnabled(e.target.checked)} />
                ROI enabled
              </label>
              <Field label="Notes" className="sm:col-span-2">
                <textarea className={inputClass} rows={2} value={farmerNotes} onChange={(e) => setFarmerNotes(e.target.value)} />
              </Field>
            </div>
          </section>
        </div>
      )}
    </Modal>
  );
}
